// Browser-side article translator.
//
// Scope: the article's <h1> title and the body inside `.prose`. Page chrome
// (header, footer, sidebar, TOC title, related posts, comments) is left alone.
//
// The service returns translated *HTML*. We never insert that HTML into the
// page: the response is parsed into an inert <template>, its tag tree is
// validated against the live block, and only text nodes are copied across.
// That keeps the original markup (links, code, tables, alerts, footnotes)
// intact no matter what the model returns, and it means a malformed response
// can only leave a block untranslated — never inject markup.
//
// Requests are opt-in (the reader presses Translate), chunked to stay well
// below the model's limits, and capped at a few in-flight requests. Finished
// translations are cached per article + target language in memory and in
// sessionStorage, so showing the original and switching back (or reloading the
// tab) never triggers another API call while the source is unchanged.

import { TRANSLATE } from '../../config/translate';
import {
	detectTargetLanguage,
	languageFromCode,
	SUPPORTED_LANGUAGES,
	type TargetLanguage,
} from './languages';

const DISMISS_KEY = 'blog:tx:dismissed';
const LANG_KEY = 'blog:tx:lang';
const CACHE_PREFIX = 'blog:tx:cache:v1:';
const ORIGINAL_PREFIX = 'blog:tx:orig:v1:';
const CHUNK_CHARS = 1000;
const CHUNK_BLOCKS = 8;
const CONCURRENCY = 3;
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_CACHE_ENTRIES = 8;

const HAN_RE = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u;

/** Elements whose contents must never be translated. */
const SKIP_CONTENT = new Set(['PRE', 'CODE', 'KBD', 'SAMP', 'VAR', 'SCRIPT', 'STYLE', 'TEXTAREA', 'SVG', 'MATH']);

/** Elements that are not treated as block boundaries. */
const BLOCK_TAGS = new Set([
	'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
	'LI', 'DT', 'DD', 'FIGCAPTION',
	'SUMMARY', 'BLOCKQUOTE', 'PRE', 'DIV', 'SECTION', 'ARTICLE',
	'ASIDE', 'HEADER', 'FOOTER', 'NAV', 'DETAILS', 'ADDRESS',
	// A whole table is one translation unit: serialising an isolated <td>
	// would not survive the HTML parse on the way back.
	'TABLE',
]);

const VOID_TAGS = new Set([
	'BR', 'IMG', 'HR', 'INPUT', 'SOURCE', 'TRACK', 'WBR', 'AREA', 'BASE', 'COL', 'EMBED', 'LINK', 'META', 'PARAM',
]);

/** Subtrees that are excluded from translation and from the HTML we send. */
const SKIP_ZONE = [
	'.entry-head',
	'.related-posts',
	'.comments',
	'.encrypted-post',
	'.enc-gate',
	'[data-pagefind-ignore]',
	'[data-no-translate]',
	'[translate="no"]',
].join(',');

/** Elements removed from the HTML before sending, and ignored on the way back. */
const REMOVED_SELECTOR = [
	'[data-no-translate]',
	'[translate="no"]',
	'button',
	'input',
	'select',
	'textarea',
	'script',
	'style',
	'noscript',
	'.code-copy',
].join(',');

interface TContext {
	originals: Map<Text, string>;
	inserted: Text[];
}

interface Chunk {
	blocks: HTMLElement[];
	html: string;
}

interface CacheEntry {
	/** Translated outerHTML per block; null where the block failed. */
	blocks: (string | null)[];
	/** Fingerprint of the source blocks, so stale translations are dropped. */
	fingerprint: string;
}

type Status = 'idle' | 'running' | 'done' | 'error';

interface TxState {
	toast: HTMLElement;
	target: TargetLanguage;
	status: Status;
	controller: AbortController | null;
	originals: Map<Text, string>;
	inserted: Text[];
	tocOriginals: Map<HTMLAnchorElement, string>;
	originalTitle: string;
	originalLang: string;
	progress: { done: number; total: number };
	failures: number;
	error: string;
	promptTimer: number | null;
	hideTimer: number | null;
}

let state: TxState | null = null;
let initialized = false;
let manualButton: HTMLButtonElement | null = null;

const cache = new Map<string, CacheEntry>();
const cacheOrder: string[] = [];

/* -------------------------------------------------------------------------- */
/* Boot / teardown                                                             */
/* -------------------------------------------------------------------------- */

export function initArticleTranslator(): void {
	if (typeof window === 'undefined' || !TRANSLATE.enabled) return;

	if (initialized) {
		mount();
		return;
	}
	initialized = true;

	document.addEventListener('astro:page-load', mount);
	document.addEventListener('astro:after-swap', mount);
	document.addEventListener('astro:before-swap', teardown);
	document.addEventListener('blog:content-decrypted', onContentDecrypted);

	// On the initial page load Astro's `page-load` event may fire before this
	// module runs (it is bundled as a deferred module). Mount once the DOM is
	// available; `mount` is idempotent for the same toast.
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', mount, { once: true });
	} else {
		queueMicrotask(mount);
	}
}

function teardown(): void {
	if (!state) return;
	state.controller?.abort();
	if (state.promptTimer !== null) window.clearTimeout(state.promptTimer);
	if (state.hideTimer !== null) window.clearTimeout(state.hideTimer);
	// <html lang> lives outside the swapped <body>, so a translated article's
	// language must be put back explicitly before the next page is shown.
	if (document.documentElement.lang !== state.originalLang) {
		document.documentElement.lang = state.originalLang;
	}
	state = null;
	manualButton = null;
}

/** Re-run after an encrypted article is unlocked. */
function onContentDecrypted(): void {
	if (!state || state.status !== 'idle') return;
	if (document.querySelector('.prose .encrypted-post[data-cipher]')) return;

	ensureManualButton();
	if (prefersOriginal()) return;
	if (applyFromCache()) {
		if (state && state.failures > 0) {
			render();
			showToast();
			scheduleHide(12000);
		}
		return;
	}
	schedulePrompt(700);
}

function mount(): void {
	const toast = document.getElementById('tx-toast');
	if (!toast) return;
	if (toast.dataset.txMounted === '1') return;
	toast.dataset.txMounted = '1';

	teardown();

	const detected = detectTargetLanguage();
	if (!detected) return;
	const target = readSavedLanguage() ?? detected;

	const prose = document.querySelector<HTMLElement>('.prose');
	const title = prose?.querySelector<HTMLElement>('.entry-head h1') ?? null;
	if (!prose || !title) return;

	state = {
		toast,
		target,
		status: 'idle',
		controller: null,
		originals: new Map(),
		inserted: [],
		tocOriginals: new Map(),
		originalTitle: document.title,
		originalLang: document.documentElement.lang || 'zh-CN',
		progress: { done: 0, total: 0 },
		failures: 0,
		error: '',
		promptTimer: null,
		hideTimer: null,
	};

	wireToast(toast);
	ensureManualButton();

	if (isLocked()) return;
	if (prefersOriginal()) return;
	if (applyFromCache()) {
		if (state && state.failures > 0) {
			render();
			showToast();
			scheduleHide(12000);
		}
		return;
	}
	schedulePrompt(900);
}

function isLocked(): boolean {
	return !!document.querySelector('.prose .encrypted-post[data-cipher]');
}

/* -------------------------------------------------------------------------- */
/* Toast UI                                                                    */
/* -------------------------------------------------------------------------- */

function wireToast(toast: HTMLElement): void {
	if (toast.dataset.txWired === '1') return;
	toast.dataset.txWired = '1';

	const language = toast.querySelector<HTMLSelectElement>('[data-tx-lang]');
	if (language && language.options.length === 0) {
		for (const option of SUPPORTED_LANGUAGES) {
			const item = document.createElement('option');
			item.value = option.code;
			item.textContent =
				option.nativeName && option.nativeName !== option.englishName
					? `${option.englishName} (${option.nativeName})`
					: option.englishName;
			language.append(item);
		}
		language.addEventListener('change', onLanguageChange);
	}

	toast.addEventListener('click', (event) => {
		const el = (event.target as Element | null)?.closest<HTMLElement>('[data-tx-action]');
		if (!el) return;
		const action = el.dataset.txAction;
		if (!action) return;

		if (action === 'close') {
			if (state?.status === 'running') cancelTranslation();
			else {
				if (state?.status === 'idle') dismissForSession();
				hideToast();
			}
			return;
		}
		if (action === 'dismiss') {
			if (state?.status === 'idle') dismissForSession();
			hideToast();
			return;
		}
		if (action === 'translate') {
			clearPromptTimer();
			void startTranslation();
			return;
		}
		if (action === 'retry') {
			restoreOriginals();
			void startTranslation(true);
			return;
		}
		if (action === 'cancel') {
			cancelTranslation();
			return;
		}
		if (action === 'original') {
			restoreOriginals();
			hideToast();
		}
	});

	// Let the reader read a completed/error notice without it vanishing.
	const pause = () => clearHideTimer();
	toast.addEventListener('pointerenter', pause);
	toast.addEventListener('focusin', pause);
}

function schedulePrompt(delay: number): void {
	if (!state || state.status !== 'idle') return;
	if (isDismissed()) return;
	if (collectBlocks().length === 0) return;
	clearPromptTimer();
	state.promptTimer = window.setTimeout(() => {
		if (!state || state.status !== 'idle') return;
		showPrompt();
	}, delay);
}

function clearPromptTimer(): void {
	if (!state || state.promptTimer === null) return;
	window.clearTimeout(state.promptTimer);
	state.promptTimer = null;
}

function showPrompt(): void {
	if (!state) return;
	clearHideTimer();
	render();
	showToast();
}

function showToast(): void {
	if (!state) return;
	const toast = state.toast;
	toast.hidden = false;
	requestAnimationFrame(() => toast.classList.add('is-visible'));
}

function hideToast(): void {
	if (!state) return;
	const toast = state.toast;
	toast.classList.remove('is-visible');
	window.setTimeout(() => {
		if (!toast.classList.contains('is-visible')) toast.hidden = true;
	}, 220);
}

function clearHideTimer(): void {
	if (!state || state.hideTimer === null) return;
	window.clearTimeout(state.hideTimer);
	state.hideTimer = null;
}

function scheduleHide(delay: number): void {
	if (!state) return;
	clearHideTimer();
	state.hideTimer = window.setTimeout(() => {
		if (!state) return;
		state.hideTimer = null;
		if (state.status === 'done' || state.status === 'error') hideToast();
	}, delay);
}

function isDismissed(): boolean {
	try {
		return sessionStorage.getItem(DISMISS_KEY) === '1';
	} catch {
		return false;
	}
}

function dismissForSession(): void {
	try {
		sessionStorage.setItem(DISMISS_KEY, '1');
	} catch {
		/* private mode — the prompt simply reappears next page */
	}
}

/** Language chosen earlier in this tab, if any. */
function readSavedLanguage(): TargetLanguage | null {
	try {
		const code = sessionStorage.getItem(LANG_KEY);
		return code ? languageFromCode(code) : null;
	} catch {
		return null;
	}
}

function saveLanguage(code: string): void {
	try {
		sessionStorage.setItem(LANG_KEY, code);
	} catch {
		/* private mode — the picker still works for this page */
	}
}

function syncLanguageSelect(): void {
	if (!state) return;
	const select = state.toast.querySelector<HTMLSelectElement>('[data-tx-lang]');
	if (!select) return;
	select.value = state.target.code;
	select.disabled = state.status === 'running';
}

function onLanguageChange(): void {
	if (!state) return;
	const select = state.toast.querySelector<HTMLSelectElement>('[data-tx-lang]');
	if (!select) return;
	const next = languageFromCode(select.value);
	if (!next) {
		select.value = state.target.code;
		return;
	}
	if (state.status === 'running') {
		select.value = state.target.code;
		return;
	}

	saveLanguage(next.code);
	clearPromptTimer();
	clearHideTimer();

	// A finished translation is in the old language: put the Chinese original
	// back, then ask again with the newly picked target.
	if (state.status === 'done') restoreOriginals();
	state.target = next;
	state.status = 'idle';
	state.error = '';
	render();
	showToast();
}

function render(): void {
	if (!state) return;
	const { toast, status, target } = state;
	toast.dataset.state = status;

	const title = toast.querySelector<HTMLElement>('[data-tx-title]');
	const body = toast.querySelector<HTMLElement>('[data-tx-body]');
	const actions = toast.querySelector<HTMLElement>('[data-tx-actions]');
	const progress = toast.querySelector<HTMLElement>('[data-tx-progress]');
	const close = toast.querySelector<HTMLElement>('[data-tx-close]');
	if (!title || !body || !actions || !progress || !close) return;

	syncLanguageSelect();
	actions.replaceChildren();
	progress.hidden = true;
	close.setAttribute('aria-label', status === 'running' ? 'Cancel translation' : 'Close');

	if (status === 'idle') {
		title.textContent = `Read this article in ${target.englishName}?`;
		body.textContent =
			'This article is written in Chinese. Translate its title and body into ' +
			`${target.englishName}?`;
		actions.append(
			actionButton('Translate', 'translate', true),
			actionButton('Not now', 'dismiss', false),
		);
		return;
	}

	if (status === 'running') {
		title.textContent = 'Translating…';
		body.textContent = 'Sending the title and body to Bilibili. This can take a few seconds.';
		progress.hidden = false;
		actions.append(actionButton('Cancel', 'cancel', false));
		renderProgress();
		return;
	}

	if (status === 'done') {
		title.textContent = `Translated into ${target.englishName}.`;
		body.textContent =
			state.failures > 0
				? `${state.failures} section${state.failures === 1 ? '' : 's'} could not be translated and remain in Chinese.`
				: 'Use “Show original” to switch back to Chinese at any time.';
		actions.append(actionButton('Show original', 'original', true));
		if (state.failures > 0) actions.append(actionButton('Retry', 'retry', false));
		return;
	}

	title.textContent = 'Translation failed';
	body.textContent = `${state.error} You can retry, or keep reading the Chinese original.`;
	actions.append(actionButton('Retry', 'retry', true), actionButton('Dismiss', 'dismiss', false));
}

function renderProgress(): void {
	if (!state) return;
	const progress = state.toast.querySelector<HTMLElement>('[data-tx-progress]');
	const percent = state.toast.querySelector<HTMLElement>('[data-tx-percent]');
	const { done, total } = state.progress;
	const value = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
	if (percent) percent.textContent = `${value}%`;
	if (progress) progress.setAttribute('aria-valuenow', String(value));
}

function actionButton(label: string, action: string, primary: boolean): HTMLButtonElement {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = `tx-btn${primary ? ' primary' : ''}`;
	button.dataset.txAction = action;
	button.textContent = label;
	return button;
}

function ensureManualButton(): void {
	if (!state || manualButton?.isConnected) return;
	if (isLocked()) return;
	if (collectBlocks().length === 0) return;

	const meta = document.querySelector<HTMLElement>('.prose .entry-head .meta');
	if (!meta || meta.querySelector('.tx-manual')) return;

	const dot = document.createElement('span');
	dot.className = 'dot';
	dot.textContent = '/';
	dot.dataset.noTranslate = '';

	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'tx-manual';
	button.dataset.noTranslate = '';
	button.dataset.txAction = 'manual';
	button.textContent = 'TRANSLATE';
	button.title = 'Translate this article';
	button.setAttribute('aria-label', 'Translate this article');
	button.setAttribute('aria-pressed', 'false');
	button.addEventListener('click', () => {
		if (!state || state.status === 'running') return;
		clearPromptTimer();
		clearHideTimer();
		if (state.status === 'done') {
			restoreOriginals();
			hideToast();
			return;
		}
		// Opening the prompt (rather than translating immediately) is what
		// makes the language picker reachable from the manual button.
		state.status = 'idle';
		state.error = '';
		render();
		showToast();
	});

	meta.append(dot, button);
	manualButton = button;
	updateManualButton();
}

function updateManualButton(): void {
	if (!state) return;
	const button = manualButton?.isConnected ? manualButton : document.querySelector<HTMLButtonElement>('.tx-manual');
	if (!button) return;
	manualButton = button;
	const done = state.status === 'done';
	button.textContent = done ? 'ORIGINAL' : 'TRANSLATE';
	button.title = done ? 'Show the Chinese original' : 'Translate this article';
	button.setAttribute('aria-label', done ? 'Show the Chinese original' : 'Translate this article');
	button.setAttribute('aria-pressed', done ? 'true' : 'false');
	button.disabled = state.status === 'running';
	button.classList.toggle('is-busy', state.status === 'running');
}

/* -------------------------------------------------------------------------- */
/* Translation flow                                                            */
/* -------------------------------------------------------------------------- */

async function startTranslation(force = false): Promise<void> {
	if (!state || !TRANSLATE.enabled) return;
	if (state.status === 'running') return;
	if (isLocked()) return;

	// A retry must always start from the Chinese source.
	if (state.originals.size > 0 || state.inserted.length > 0) restoreOriginals();
	clearPromptTimer();
	clearHideTimer();
	clearOriginal();

	// Switching back from the original view should not cost another request:
	// replay the cached translation for this article + target language.
	if (!force && applyFromCache()) {
		render();
		showToast();
		scheduleHide(9000);
		return;
	}

	const blocks = collectBlocks();
	if (blocks.length === 0) {
		state.status = 'error';
		state.error = 'No translatable article text was found.';
		render();
		showToast();
		scheduleHide(8000);
		return;
	}

	// Fingerprint the Chinese source *before* the rewrite below, so a later
	// cache lookup (after "Show original" or a reload) sees the same value.
	const fingerprint = fingerprintBlocks(blocks);
	const chunks = makeChunks(blocks);
	const controller = new AbortController();
	state.controller = controller;
	state.status = 'running';
	state.failures = 0;
	state.error = '';
	state.progress = { done: 0, total: chunks.length };
	updateManualButton();
	render();
	showToast();

	try {
		const target = state.target;
		const results = await mapLimit(chunks, CONCURRENCY, async (chunk) => {
			if (controller.signal.aborted) throw abortError();
			const result = await translateChunk(chunk, target, controller.signal);
			if (state) {
				state.progress.done += 1;
				renderProgress();
			}
			return result;
		});

		if (controller.signal.aborted || !state) return;

		const ctx: TContext = { originals: new Map(), inserted: [] };
		// Publish the maps before rewriting so a failure halfway through the
		// apply loop can still be undone by Retry / Show original.
		state.originals = ctx.originals;
		state.inserted = ctx.inserted;
		const cached: (string | null)[] = new Array(blocks.length).fill(null);
		let success = 0;
		let failed = 0;
		let cursor = 0;

		for (let ci = 0; ci < chunks.length; ci++) {
			const chunk = chunks[ci]!;
			const result = results[ci];
			for (let bi = 0; bi < chunk.blocks.length; bi++) {
				const block = chunk.blocks[bi]!;
				const html = result?.[bi] ?? null;
				if (html && applyTranslatedBlock(block, html, ctx)) {
					success += 1;
					cached[cursor] = html;
				} else {
					failed += 1;
				}
				cursor += 1;
			}
		}

		if (success === 0) throw new Error('The translation service returned no usable text.');

		state.failures = failed;
		state.status = 'done';
		state.controller = null;
		finalizeTranslation(target);
		updateManualButton();

		if (success > 0) {
			setCache(cacheKey(target), {
				blocks: cached,
				fingerprint,
			});
		}

		render();
		showToast();
		scheduleHide(failed > 0 ? 12000 : 9000);
	} catch (error) {
		if (!state || state.controller !== controller) return;
		if (controller.signal.aborted) {
			state.status = 'idle';
			state.controller = null;
			render();
			updateManualButton();
			hideToast();
			return;
		}
		state.status = 'error';
		state.controller = null;
		state.error = describeError(error);
		render();
		showToast();
		scheduleHide(12000);
		updateManualButton();
		console.warn('[translate] failed', error);
	}
}

function cancelTranslation(): void {
	const s = state;
	if (!s?.controller) return;
	const controller = s.controller;
	s.controller = null;
	controller.abort(abortError());

	// Update the UI immediately; the in-flight request's catch sees that it is
	// no longer the current controller and leaves this new state alone.
	s.status = 'idle';
	s.error = '';
	s.failures = 0;
	render();
	updateManualButton();
	hideToast();
}

function abortError(): DOMException {
	return new DOMException('Translation cancelled', 'AbortError');
}

function describeError(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	if (/HTTP\s+429/.test(message)) return 'The translation service is busy. Try again in a moment.';
	if (/HTTP\s+412/.test(message)) return 'The translation service refused the request.';
	if (/HTTP\s+(5\d\d)/.test(message)) return 'The translation service is temporarily unavailable.';
	if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
		return 'Could not reach the translation service (network or CORS).';
	}
	if (/timed out|TimeoutError/i.test(message)) return 'The translation service took too long to respond.';
	if (/no usable text/i.test(message)) {
		return 'The translation service returned a result that could not be safely applied; the original is unchanged.';
	}
	return 'An unexpected error interrupted the translation.';
}

async function translateChunk(
	chunk: Chunk,
	target: TargetLanguage,
	signal: AbortSignal,
): Promise<(string | null)[]> {
	const parsed = await requestWithRetry(chunk.html, chunk.blocks, target, signal);
	if (parsed) return parsed;

	// A chunk whose structure the model changed is retried block by block.
	// Small single-block requests are much easier for the model to obey.
	const fallback = await mapLimit(chunk.blocks, 2, async (block) => {
		if (signal.aborted) throw signal.reason;
		const html = `<div data-tx-root="1">${serializeBlock(block)}</div>`;
		const one = await requestWithRetry(html, [block], target, signal);
		return one?.[0] ?? null;
	});
	return fallback;
}

async function requestWithRetry(
	html: string,
	expected: HTMLElement[],
	target: TargetLanguage,
	signal: AbortSignal,
): Promise<string[] | null> {
	for (let attempt = 0; attempt < 2; attempt++) {
		if (signal.aborted) throw signal.reason;
		try {
			const text = await requestTranslation(html, target, signal);
			const parsed = parseTranslatedHtml(text, expected);
			if (parsed) return parsed;
		} catch (error) {
			if (signal.aborted) throw error;
			if (attempt === 1) console.warn('[translate] request failed', error);
		}
		if (attempt === 0) await delay(700, signal);
	}
	return null;
}

async function requestTranslation(
	html: string,
	target: TargetLanguage,
	signal: AbortSignal,
): Promise<string> {
	const controller = new AbortController();
	const timer = window.setTimeout(
		() => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
		REQUEST_TIMEOUT_MS,
	);
	const onAbort = () => controller.abort(signal.reason);
	if (signal.aborted) controller.abort(signal.reason);
	else signal.addEventListener('abort', onAbort, { once: true });

	try {
		const response = await fetch(TRANSLATE.endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: TRANSLATE.model,
				messages: [{ role: 'user', content: buildPrompt(html, target) }],
				temperature: 0,
				max_tokens: 4096,
				stream: false,
				chat_template_kwargs: { enable_thinking: false },
			}),
			signal: controller.signal,
		});

		if (!response.ok) {
			const detail = await response.text().catch(() => '');
			throw new Error(`HTTP ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`);
		}

		const data = (await response.json()) as {
			choices?: { message?: { content?: unknown } }[];
		};
		const content = data.choices?.[0]?.message?.content;
		if (typeof content !== 'string' || !content.trim()) {
			throw new Error('The translation service returned an empty response.');
		}
		return content;
	} finally {
		window.clearTimeout(timer);
		signal.removeEventListener('abort', onAbort);
	}
}

function buildPrompt(html: string, target: TargetLanguage): string {
	return [
		`你是 HTML 翻译器。请把下面 HTML 中所有可读文本翻译为${target.promptName}。`,
		'',
		'【绝对规则】',
		'1. 不得改动 HTML：标签名、属性、属性值、嵌套关系、标签顺序、标签数量以及 data-tx-root 外层包裹都必须与原文完全一致。',
		'2. 只能替换文本节点。不要添加、删除、合并、拆分、重排或改写任何标签，也不要改动任何属性。',
		'3. 不要翻译 <code>、<pre>、<kbd>、<samp> 内的内容，也不要翻译 URL、邮箱、代码标识符、变量名、文件名和路径。',
		'4. 保留原有的空白和换行。',
		'5. 只输出翻译后的 HTML 本身，不要输出 Markdown 代码围栏、解释、前言或后记。',
		'',
		'【待翻译 HTML】',
		html,
	].join('\n');
}

function parseTranslatedHtml(text: string, expected: HTMLElement[]): string[] | null {
	let clean = text.trim();
	if (clean.includes('<｜end▁of▁thinking｜>')) clean = clean.split('<｜end▁of▁thinking｜>').pop() ?? clean;
	if (clean.includes('</think>')) clean = clean.split('</think>').pop() ?? clean;
	clean = clean
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		.replace(/^```(?:html)?\s*/i, '')
		.replace(/\s*```$/i, '')
		.trim();
	if (!clean) return null;

	const doc = new DOMParser().parseFromString(clean, 'text/html');
	const isMeta = (el: Element) => /^(SCRIPT|STYLE|LINK|META|TITLE)$/.test(el.tagName);

	let root: Element | null = doc.querySelector('[data-tx-root]');
	if (!root) {
		const top = Array.from(doc.body.children).filter((el) => !isMeta(el));
		if (top.length === expected.length) root = doc.body;
		else if (top.length === 1 && top[0]!.children.length === expected.length) root = top[0]!;
		else root = doc.body;
	}

	const container = root ?? doc.body;
	const elements = Array.from(container.children).filter((el) => !isMeta(el));
	if (elements.length !== expected.length) return null;
	for (let i = 0; i < elements.length; i++) {
		if (elements[i]!.tagName !== expected[i]!.tagName) return null;
	}
	return elements.map((el) => el.outerHTML);
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(signal.reason);
			return;
		}
		const timer = window.setTimeout(() => {
			signal.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			window.clearTimeout(timer);
			reject(signal.reason);
		};
		signal.addEventListener('abort', onAbort, { once: true });
	});
}

async function mapLimit<T, R>(
	items: T[],
	limit: number,
	worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
		for (;;) {
			const index = next++;
			if (index >= items.length) return;
			results[index] = await worker(items[index]!, index);
		}
	});
	await Promise.all(runners);
	return results;
}

/* -------------------------------------------------------------------------- */
/* DOM collection + rewriting                                                  */
/* -------------------------------------------------------------------------- */

function collectBlocks(): HTMLElement[] {
	const prose = document.querySelector<HTMLElement>('.prose');
	if (!prose) return [];

	const blocks: HTMLElement[] = [];
	const title = prose.querySelector<HTMLElement>('.entry-head h1');
	if (title && hasTranslatableText(title)) blocks.push(title);

	const visit = (el: Element) => {
		if (isSkippedSubtree(el)) return;
		// Keep a table/li intact. An isolated <td> does not survive the trip
		// through HTML parsing, and an <li> with a nested list has meaningful
		// text beside its child blocks — translating the whole list item keeps
		// that text instead of silently skipping it.
		if (el.tagName === 'TABLE' || el.tagName === 'LI') {
			if (hasTranslatableText(el)) blocks.push(el as HTMLElement);
			return;
		}
		if (BLOCK_TAGS.has(el.tagName) && !hasBlockDescendant(el)) {
			if (hasTranslatableText(el)) blocks.push(el as HTMLElement);
			return;
		}
		for (const child of Array.from(el.children)) visit(child);
	};

	for (const child of Array.from(prose.children)) visit(child);
	return blocks;
}

function isSkippedSubtree(el: Element): boolean {
	if (SKIP_CONTENT.has(el.tagName)) return true;
	return el.matches(SKIP_ZONE);
}

function hasBlockDescendant(el: Element): boolean {
	for (const child of Array.from(el.children)) {
		// PRE is a block boundary even though its contents are skipped.
		if (BLOCK_TAGS.has(child.tagName)) return true;
		if (isSkippedSubtree(child)) continue;
		if (hasBlockDescendant(child)) return true;
	}
	return false;
}

function hasTranslatableText(el: Element): boolean {
	const clone = el.cloneNode(true) as Element;
	clone
		.querySelectorAll(
			'pre,code,kbd,samp,var,script,style,noscript,textarea,input,select,button,svg,math,[data-no-translate],[translate="no"]',
		)
		.forEach((node) => node.remove());
	return HAN_RE.test(clone.textContent ?? '');
}

function serializeBlock(block: Element): string {
	const clone = block.cloneNode(true) as Element;
	clone.querySelectorAll(REMOVED_SELECTOR).forEach((node) => node.remove());
	return clone.outerHTML;
}

function makeChunks(blocks: HTMLElement[]): Chunk[] {
	const chunks: Chunk[] = [];
	let current: HTMLElement[] = [];
	let html = '';

	const flush = () => {
		if (current.length === 0) return;
		chunks.push({
			blocks: current,
			html: `<div data-tx-root="1">${html}</div>`,
		});
		current = [];
		html = '';
	};

	for (const block of blocks) {
		const serialized = serializeBlock(block);
		if (
			current.length > 0 &&
			(html.length + serialized.length > CHUNK_CHARS || current.length >= CHUNK_BLOCKS)
		) {
			flush();
		}
		current.push(block);
		html += serialized;
	}
	flush();
	return chunks;
}

function isText(node: Node): node is Text {
	return node.nodeType === Node.TEXT_NODE;
}

function isRemovedElement(el: Element): boolean {
	return el.matches(REMOVED_SELECTOR);
}

function significantChildren(parent: Element): Node[] {
	const out: Node[] = [];
	for (const node of Array.from(parent.childNodes)) {
		if (isText(node)) {
			if ((node.nodeValue ?? '').trim().length > 0) out.push(node);
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			if (!isRemovedElement(node as Element)) out.push(node);
		}
	}
	return out;
}

function validateChildren(original: Element, translated: Element): boolean {
	const a = significantChildren(original);
	const b = significantChildren(translated);
	let i = 0;
	let j = 0;

	while (i < a.length || j < b.length) {
		const an = a[i];
		const bn = b[j];

		if (an && bn) {
			const at = isText(an);
			const bt = isText(bn);
			if (at && bt) {
				i += 1;
				j += 1;
				continue;
			}
			if (at !== bt) {
				// Extra translated text beside an element is safe: it becomes a
				// plain text node. An extra *element* is not, and fails.
				if (!at && bt) {
					j += 1;
					continue;
				}
				return false;
			}

			const ae = an as Element;
			const be = bn as Element;
			if (ae.tagName !== be.tagName) return false;
			if (!SKIP_CONTENT.has(ae.tagName) && !VOID_TAGS.has(ae.tagName)) {
				if (!validateChildren(ae, be)) return false;
			}
			i += 1;
			j += 1;
			continue;
		}

		if (an) {
			if (!isText(an)) return false;
			i += 1;
			continue;
		}
		if (bn) {
			if (!isText(bn)) return false;
			j += 1;
			continue;
		}
	}
	return true;
}

function applyChildren(original: Element, translated: Element, ctx: TContext): void {
	const a = significantChildren(original);
	const b = significantChildren(translated);
	let i = 0;
	let j = 0;
	let lastPlaced: Node | null = null;

	while (i < a.length || j < b.length) {
		const an = a[i];
		const bn = b[j];

		if (an && bn) {
			const at = isText(an);
			const bt = isText(bn);

			if (at && bt) {
				setText(an, bn.nodeValue ?? '', ctx);
				lastPlaced = an;
				i += 1;
				j += 1;
				continue;
			}

			// An extra translated text node sits beside an element. Insert it
			// *before* that element, matching validation's alignment. Do not
			// recurse here: `an` is not the translated text's parent.
			if (!at && bt) {
				const value = bn.nodeValue ?? '';
				if (value.trim()) {
					const text = document.createTextNode(value);
					original.insertBefore(text, an);
					ctx.inserted.push(text);
					lastPlaced = text;
				}
				j += 1;
				continue;
			}

			// Validation rejects this pairing; guard so a future change cannot
			// turn it into an insertBefore() on a Text node.
			if (at && !bt) {
				console.warn('[translate] unexpected node pairing after validation');
				return;
			}

			const ae = an as Element;
			const be = bn as Element;
			if (!SKIP_CONTENT.has(ae.tagName) && !VOID_TAGS.has(ae.tagName)) {
				applyChildren(ae, be, ctx);
			}
			lastPlaced = ae;
			i += 1;
			j += 1;
			continue;
		}

		if (an) {
			// The translation merged this text into a neighbouring node.
			setText(an as Text, '', ctx);
			lastPlaced = an;
			i += 1;
			continue;
		}

		if (bn) {
			// The translation split text into an extra node; keep the words,
			// as a plain text node only (never markup).
			const value = bn.nodeValue ?? '';
			if (value.trim()) {
				const text = document.createTextNode(value);
				const reference = lastPlaced ? lastPlaced.nextSibling : original.firstChild;
				original.insertBefore(text, reference);
				ctx.inserted.push(text);
				lastPlaced = text;
			}
			j += 1;
			continue;
		}
	}
}

function setText(node: Text, value: string, ctx: TContext): void {
	if (!ctx.originals.has(node)) ctx.originals.set(node, node.nodeValue ?? '');
	const original = ctx.originals.get(node) ?? '';
	if (!value.trim()) {
		node.nodeValue = '';
		return;
	}

	const lead = /^\s*/.exec(value)?.[0] ?? '';
	const trail = /\s*$/.exec(value)?.[0] ?? '';
	const originalLead = /^\s*/.exec(original)?.[0] ?? '';
	const originalTrail = /\s*$/.exec(original)?.[0] ?? '';
	node.nodeValue = (lead || originalLead) + value.trim() + (trail || originalTrail);
}

function applyTranslatedBlock(original: HTMLElement, html: string, ctx: TContext): boolean {
	const template = document.createElement('template');
	template.innerHTML = html;
	const translated = template.content.firstElementChild;
	if (!translated || translated.tagName !== original.tagName) return false;
	if (!validateChildren(original, translated)) return false;
	applyChildren(original, translated, ctx);
	return true;
}

/* -------------------------------------------------------------------------- */
/* Applying a translation to the page                                          */
/* -------------------------------------------------------------------------- */

function finalizeTranslation(target: TargetLanguage): void {
	const title = document.querySelector<HTMLElement>('.prose .entry-head h1');
	if (title) document.title = title.textContent?.trim() || document.title;
	document.documentElement.lang = target.tag;
	syncToc();
	updateManualButton();
}

function syncToc(): void {
	if (!state) return;
	const links = document.querySelectorAll<HTMLAnchorElement>('.toc-sidebar a[href^="#"]');
	for (const link of links) {
		const href = link.getAttribute('href') ?? '';
		let id = '';
		try {
			id = decodeURIComponent(href.slice(1));
		} catch {
			id = href.slice(1);
		}
		const heading = id ? document.getElementById(id) : null;
		if (!heading) continue;
		if (!state.tocOriginals.has(link)) state.tocOriginals.set(link, link.textContent ?? '');
		link.textContent = heading.textContent?.trim() ?? link.textContent;
	}
}

function restoreOriginals(): void {
	if (!state) return;
	for (const [node, value] of state.originals) {
		if (node.isConnected) node.nodeValue = value;
	}
	for (const node of state.inserted) {
		if (node.isConnected) node.remove();
	}
	state.originals.clear();
	state.inserted.length = 0;

	document.title = state.originalTitle;
	document.documentElement.lang = state.originalLang;
	for (const [link, value] of state.tocOriginals) {
		if (link.isConnected) link.textContent = value;
	}
	state.tocOriginals.clear();

	state.status = 'idle';
	state.failures = 0;
	state.error = '';
	state.controller = null;
	// Keep the cached translation. "Show original" is a view toggle, not a
	// request to throw the translation away; clicking TRANSLATE again should
	// replay it without another API call.
	markOriginal();
	updateManualButton();
}

/* -------------------------------------------------------------------------- */
/* Translation cache (memory + sessionStorage, per tab)                        */
/* -------------------------------------------------------------------------- */

function cacheKey(target: TargetLanguage): string {
	// Include the model so switching TRANSLATE.model starts from fresh output.
	return `${location.pathname}|${target.code}|${TRANSLATE.model}`;
}

/** Cheap content fingerprint so a rebuilt/changed article drops stale output. */
function fingerprintBlocks(blocks: HTMLElement[]): string {
	let hash = 2166136261;
	for (const block of blocks) {
		const source = serializeBlock(block);
		for (let i = 0; i < source.length; i++) {
			hash ^= source.charCodeAt(i);
			hash = Math.imul(hash, 16777619);
		}
		hash ^= 0x1f;
		hash = Math.imul(hash, 16777619);
	}
	return `${(hash >>> 0).toString(36)}:${blocks.length}`;
}

function touchCache(key: string, entry: CacheEntry): void {
	cache.delete(key);
	cache.set(key, entry);
	const existing = cacheOrder.indexOf(key);
	if (existing >= 0) cacheOrder.splice(existing, 1);
	cacheOrder.push(key);
	while (cacheOrder.length > MAX_CACHE_ENTRIES) {
		const oldest = cacheOrder.shift();
		if (!oldest) continue;
		cache.delete(oldest);
		try {
			sessionStorage.removeItem(CACHE_PREFIX + oldest);
		} catch {
			/* private mode */
		}
	}
}

function pruneStorageCache(): void {
	try {
		const keys: string[] = [];
		for (let i = 0; i < sessionStorage.length; i++) {
			const key = sessionStorage.key(i);
			if (key?.startsWith(CACHE_PREFIX)) keys.push(key);
		}
		while (keys.length > MAX_CACHE_ENTRIES) {
			const oldest = keys.shift();
			if (oldest) sessionStorage.removeItem(oldest);
		}
	} catch {
		/* private mode */
	}
}

function setCache(key: string, entry: CacheEntry): void {
	touchCache(key, entry);
	try {
		sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
		pruneStorageCache();
	} catch {
		/* quota/private mode — the in-memory copy still works for this page */
	}
}

function readCacheEntry(key: string): CacheEntry | null {
	const memory = cache.get(key);
	if (memory) return memory;
	try {
		const raw = sessionStorage.getItem(CACHE_PREFIX + key);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<CacheEntry> | null;
		if (!parsed || !Array.isArray(parsed.blocks) || typeof parsed.fingerprint !== 'string') return null;
		const entry: CacheEntry = {
			blocks: parsed.blocks.map((block) => (typeof block === 'string' ? block : null)),
			fingerprint: parsed.fingerprint,
		};
		touchCache(key, entry);
		return entry;
	} catch {
		return null;
	}
}

function deleteCacheEntry(key: string): void {
	cache.delete(key);
	const existing = cacheOrder.indexOf(key);
	if (existing >= 0) cacheOrder.splice(existing, 1);
	try {
		sessionStorage.removeItem(CACHE_PREFIX + key);
	} catch {
		/* private mode */
	}
}

/** Remember that the reader deliberately chose the original view. */
function markOriginal(): void {
	try {
		sessionStorage.setItem(ORIGINAL_PREFIX + location.pathname, '1');
	} catch {
		/* private mode */
	}
}

function clearOriginal(): void {
	try {
		sessionStorage.removeItem(ORIGINAL_PREFIX + location.pathname);
	} catch {
		/* private mode */
	}
}

function prefersOriginal(): boolean {
	try {
		return sessionStorage.getItem(ORIGINAL_PREFIX + location.pathname) === '1';
	} catch {
		return false;
	}
}

function applyFromCache(): boolean {
	if (!state || isLocked()) return false;
	const key = cacheKey(state.target);
	const entry = readCacheEntry(key);
	if (!entry) return false;

	const blocks = collectBlocks();
	if (blocks.length !== entry.blocks.length || fingerprintBlocks(blocks) !== entry.fingerprint) {
		deleteCacheEntry(key);
		return false;
	}

	const ctx: TContext = { originals: new Map(), inserted: [] };
	let success = 0;
	let failures = 0;
	for (let i = 0; i < blocks.length; i++) {
		const html = entry.blocks[i];
		if (html && applyTranslatedBlock(blocks[i]!, html, ctx)) success += 1;
		else failures += 1;
	}
	if (success === 0) {
		deleteCacheEntry(key);
		return false;
	}

	state.originals = ctx.originals;
	state.inserted = ctx.inserted;
	state.failures = failures;
	state.status = 'done';
	finalizeTranslation(state.target);
	updateManualButton();
	return true;
}
