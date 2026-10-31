/**
 * Document, draft-storage and browser helpers for the writing room.
 *
 * Pure Markdown/frontmatter parsing lives next to the localStorage layer so
 * there is one document module and no import cycle between them.
 */

/* ------------------------------------------------------------------ frontmatter */

export interface FrontmatterBlock {
	/** Raw YAML text between the two `---` fences (without the fences). */
	raw: string;
	/** Everything after the closing fence. */
	body: string;
	/** Top-level scalar fields, unquoted. */
	fields: Record<string, string>;
}

const FRONTMATTER = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const SCALAR_FIELD = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/;

/** Split a Markdown document into its YAML frontmatter and body. */
export function splitFrontmatter(source: string): FrontmatterBlock {
	const match = FRONTMATTER.exec(source);
	if (!match) {
		return { raw: '', body: source, fields: {} };
	}

	const fields: Record<string, string> = {};
	for (const line of match[1].split(/\r?\n/)) {
		// Nested YAML (arrays/objects) is indented; only take top-level scalars.
		if (!line || /^\s/.test(line)) continue;
		const field = SCALAR_FIELD.exec(line);
		if (!field) continue;
		fields[field[1]] = unquoteYamlScalar(field[2]);
	}

	return {
		raw: match[1],
		body: source.slice(match[0].length),
		fields,
	};
}

function unquoteYamlScalar(value: string): string {
	const trimmed = value.trim();
	if (trimmed.length >= 2) {
		const first = trimmed[0];
		const last = trimmed[trimmed.length - 1];
		if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
			return trimmed.slice(1, -1);
		}
	}
	return trimmed;
}

export function getFrontmatterValue(source: string, key: string): string {
	return splitFrontmatter(source).fields[key]?.trim() ?? '';
}

export function getFrontmatterTitle(source: string): string {
	return getFrontmatterValue(source, 'title');
}

/** Remove light Markdown decoration so a first line can act as a title. */
function plainText(value: string): string {
	return value
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/^#{1,6}\s+/, '')
		.replace(/[`*_~>#]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function firstHeading(body: string): string {
	const match = /^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/m.exec(body);
	return match ? plainText(match[1]) : '';
}

function firstMeaningfulLine(body: string): string {
	for (const rawLine of body.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('```') || line.startsWith('~~~') || line === '---') continue;
		const text = plainText(line);
		if (text) return text;
	}
	return '';
}

/** Frontmatter title → first heading → first line → fallback. */
export function deriveDraftTitle(source: string, fallback = '未命名草稿'): string {
	const title = getFrontmatterTitle(source);
	if (title) return title.slice(0, 80);

	const { body } = splitFrontmatter(source);
	const candidate = firstHeading(body) || firstMeaningfulLine(body);
	if (candidate) return candidate.slice(0, 80);
	return fallback;
}

/** Format a date as YYYY-MM-DD (local time) for frontmatter. */
export function formatYmd(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * A new-post template matching `src/content.config.ts`. Only the fields the
 * blog actually uses are included; encryption fields are intentionally absent.
 */
export function createDraftContent(date = new Date()): string {
	return [
		'---',
		'title: 未命名草稿',
		'description: ""',
		`pubDate: ${formatYmd(date)}`,
		'tags: []',
		'category: ""',
		'pinned: 0',
		'---',
		'',
		'',
	].join('\n');
}

/** ASCII slug, used for the CDN preview rewrite and WebDAV names. */
export function slugifyAscii(value: string, fallback = 'post'): string {
	const slug = value
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^\x20-\x7E]+/g, '-')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return slug || fallback;
}

/**
 * Best-effort post id for `remarkCdnImages`-style rewriting. An explicit
 * `slug` frontmatter field wins; otherwise the title is slugified. Returns an
 * empty string when no ASCII id can be derived, which disables the rewrite
 * (better a bare relative image than a wrong CDN path).
 */
export function derivePreviewPostId(source: string): string {
	return slugifyAscii(getFrontmatterValue(source, 'slug') || getFrontmatterTitle(source), '');
}

/** Validate the optional draft slug. Empty is valid (returns null). */
export function validateSlug(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	if (trimmed === '.' || trimmed === '..') return 'Slug 不能是 . 或 ..';
	if (/[\\/\u0000-\u001f\u007f<>:"|?*]/.test(value)) {
		return 'Slug 不能包含 / \\ 控制字符或 <>:"|?*';
	}
	if (trimmed.length > 80) return 'Slug 不能超过 80 个字符';
	return null;
}

/** Sanitize a valid slug for use as a filename stem. */
function slugForFilename(slug: string): string {
	return slug
		.trim()
		.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '')
		.replace(/^\.+|\.+$/g, '')
		.trim();
}

/**
 * Derive a safe `.md` download name. A valid non-empty slug wins; otherwise
 * fall back to the frontmatter title and then the draft title.
 */
export function deriveMarkdownFilename(
	source: string,
	fallbackTitle: string,
	slug?: string,
): string {
	const trimmedSlug = (slug ?? '').trim();
	if (trimmedSlug && validateSlug(trimmedSlug) === null) {
		const stem = slugForFilename(trimmedSlug);
		if (stem) return `${stem}.md`;
	}

	const candidate =
		getFrontmatterTitle(source) || deriveDraftTitle(source, fallbackTitle) || fallbackTitle;
	const stem = candidate
		.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
		.replace(/\s+/g, ' ')
		.replace(/^\.+|\.+$/g, '')
		.trim()
		.slice(0, 80);
	return `${stem || 'draft'}.md`;
}

/** Count CJK characters plus Latin/digit runs. */
export function countWords(source: string): number {
	const { body } = splitFrontmatter(source);
	const cjk = body.match(/[㐀-鿿豈-﫿぀-ヿ]/g)?.length ?? 0;
	const words = body.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
	return cjk + words;
}

/** Escape `[`/`]` for use in Markdown link labels. */
export function escapeMarkdownLabel(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
}

/* ---------------------------------------------------------------------- drafts */

export interface Draft {
	id: string;
	title: string;
	content: string;
	/** Optional post slug; stored only in local draft metadata, never in Markdown. */
	slug?: string;
	createdAt: number;
	updatedAt: number;
	/** Set when the user renames a draft, so auto-save keeps the custom name. */
	titleLocked?: boolean;
}

const DRAFTS_KEY = 'saltwood.writing-room.v1.drafts';
const ACTIVE_KEY = 'saltwood.writing-room.v1.active';

export type LoadDraftsResult =
	| { ok: true; drafts: Draft[] }
	| { ok: false; message: string; raw: string | null };

export class DraftStorageError extends Error {
	readonly quotaExceeded: boolean;

	constructor(message: string, quotaExceeded = false) {
		super(message);
		this.name = 'DraftStorageError';
		this.quotaExceeded = quotaExceeded;
	}
}

export function newDraftId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDraft(now = new Date()): Draft {
	const timestamp = now.getTime();
	return {
		id: newDraftId(),
		title: '未命名草稿',
		content: createDraftContent(now),
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parseDraft(value: unknown): Draft | null {
	if (!isRecord(value)) return null;
	const { id, title, content, slug, createdAt, updatedAt, titleLocked } = value;
	if (typeof id !== 'string' || !id) return null;
	if (typeof title !== 'string') return null;
	if (typeof content !== 'string') return null;
	if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) return null;
	if (typeof updatedAt !== 'number' || !Number.isFinite(updatedAt)) return null;
	return {
		id,
		title,
		content,
		...(typeof slug === 'string' ? { slug } : {}),
		createdAt,
		updatedAt,
		...(titleLocked === true ? { titleLocked: true } : {}),
	};
}

export function loadDrafts(): LoadDraftsResult {
	if (typeof window === 'undefined') return { ok: true, drafts: [] };

	let raw: string | null = null;
	try {
		raw = window.localStorage.getItem(DRAFTS_KEY);
	} catch {
		return { ok: false, message: '无法读取本地存储（浏览器可能禁用了 localStorage）。', raw: null };
	}
	if (raw === null) return { ok: true, drafts: [] };

	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			return { ok: false, message: '本地草稿数据格式不正确，自动保存已暂停以避免覆盖。', raw };
		}
		const drafts: Draft[] = [];
		for (const item of parsed) {
			const draft = parseDraft(item);
			if (!draft) {
				return { ok: false, message: '本地草稿中包含无法识别的条目，自动保存已暂停以避免覆盖。', raw };
			}
			drafts.push(draft);
		}
		return { ok: true, drafts };
	} catch {
		return { ok: false, message: '本地草稿数据无法解析，自动保存已暂停以避免覆盖。', raw };
	}
}

export function saveDrafts(drafts: Draft[]): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
	} catch (error) {
		const quota =
			error instanceof DOMException &&
			(error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
		throw new DraftStorageError(
			quota
				? '本地存储空间不足，草稿未能保存。请复制或下载 Markdown 后删除旧草稿。'
				: '写入本地存储失败，草稿未能保存。',
			quota,
		);
	}
}

export function loadActiveDraftId(): string | null {
	if (typeof window === 'undefined') return null;
	try {
		return window.localStorage.getItem(ACTIVE_KEY);
	} catch {
		return null;
	}
}

export function saveActiveDraftId(id: string): void {
	if (typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(ACTIVE_KEY, id);
	} catch {
		// A missing active id is not worth interrupting the user over.
	}
}

/** Read the raw drafts value for a last-resort manual backup. */
export function readRawDrafts(): string | null {
	if (typeof window === 'undefined') return null;
	try {
		return window.localStorage.getItem(DRAFTS_KEY);
	} catch {
		return null;
	}
}

/* -------------------------------------------------------------------- browser */

export function isMarkdownFile(file: File): boolean {
	return /\.(md|markdown)$/i.test(file.name) || file.type === 'text/markdown';
}

export function isImageFile(file: File): boolean {
	return file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(file.name);
}

export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / 1024 ** exponent;
	return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatTimestamp(timestamp: number): string {
	try {
		return new Intl.DateTimeFormat('zh-CN', {
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(timestamp));
	} catch {
		return new Date(timestamp).toLocaleString();
	}
}

/** Clipboard API first, hidden-textarea fallback for non-secure contexts. */
export async function copyText(text: string): Promise<boolean> {
	if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch {
			// Fall through to execCommand.
		}
	}

	if (typeof document === 'undefined') return false;
	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.top = '-9999px';
	textarea.style.opacity = '0';
	document.body.appendChild(textarea);
	let copied = false;
	try {
		textarea.select();
		textarea.setSelectionRange(0, textarea.value.length);
		copied = document.execCommand('copy');
	} catch {
		copied = false;
	} finally {
		document.body.removeChild(textarea);
	}
	return copied;
}

export function downloadText(
	text: string,
	filename: string,
	mime = 'text/markdown;charset=utf-8',
): void {
	if (typeof document === 'undefined') return;
	const blob = new Blob([text], { type: mime });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.style.display = 'none';
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readTextFile(file: File): Promise<string> {
	if (typeof file.text === 'function') return file.text();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
		reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'));
		reader.readAsText(file);
	});
}
