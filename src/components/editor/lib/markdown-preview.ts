/**
 * markdown-it plugins that reproduce the blog's custom Markdown dialect in the
 * editor preview:
 *
 *   :::fold{summary="..."}  → <details class="fold"><summary>…</summary>…
 *   :::tab{title="..."}     → consecutive blocks become <div class="tab-group">
 *   > [!NOTE]               → <div class="markdown-alert markdown-alert-note">
 *   :::encrypted            → a neutral "not shown in preview" placeholder
 *
 * The generated class names match src/lib/markdown/remark-*.ts and the site
 * stylesheets. Raw HTML input remains disabled (markdown-it `html: false`);
 * only these plugin-generated tags are emitted.
 */

import type MarkdownIt from 'markdown-it';

// Extract the nested markdown-it types from the instance type: `export =`
// packages do not expose their namespace to a type-only default import.
type RuleBlock = Parameters<MarkdownIt['block']['ruler']['before']>[2];
type RuleCore = Parameters<MarkdownIt['core']['ruler']['push']>[1];
type MdToken = ReturnType<MarkdownIt['parse']>[number];
type StateBlock = Parameters<RuleBlock>[0];
type StateCore = Parameters<RuleCore>[0];

const CDN_BASE = 'https://blog-uploads.ski.ink';
const BARE_IMAGE = /^[\w.\-+ ]+\.(webp|png|jpe?g|gif|svg|avif|bmp|ico)$/i;
const DIRECTIVE_LINE = /^:::[ \t]*([A-Za-z][\w-]*)[ \t]*(?:\{([^}]*)\})?[ \t]*$/;
const CLOSING_LINE = /^:::[ \t]*$/;
const ALERT_MARKER = /^[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n)?/i;

const ALERT_ICON =
	'<svg class="octicon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">' +
	'<path fill="currentColor" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>' +
	'</svg>';

/**
 * Mutable preview context. The editor updates this before each render so the
 * CDN rewrite can use the current draft slug.
 */
let previewPostId = '';

export function setPreviewPostId(id: string): void {
	previewPostId = id;
}

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function lineAt(state: StateBlock, line: number): string {
	return state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]).trim();
}

function parseAttributes(raw: string): Record<string, string> {
	const attributes: Record<string, string> = {};
	const pattern = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
	let match: RegExpExecArray | null = pattern.exec(raw);
	while (match) {
		attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
		match = pattern.exec(raw);
	}
	return attributes;
}

function matchDirective(
	state: StateBlock,
	line: number,
	name: string,
): Record<string, string> | null {
	const match = DIRECTIVE_LINE.exec(lineAt(state, line));
	if (!match || match[1] !== name) return null;
	return parseAttributes(match[2] ?? '');
}

function findClosing(state: StateBlock, from: number, endLine: number): number {
	for (let line = from; line < endLine; line += 1) {
		if (CLOSING_LINE.test(lineAt(state, line))) return line;
	}
	return -1;
}

function skipBlankLines(state: StateBlock, from: number, endLine: number): number {
	let line = from;
	while (line < endLine && lineAt(state, line) === '') line += 1;
	return line;
}

function pushHtml(state: StateBlock, content: string): MdToken {
	const token = state.push('html_block', '', 0);
	token.block = true;
	token.content = content;
	return token;
}

/** Render the leading YAML block instead of letting `---` become an <hr>. */
const frontmatterRule: RuleBlock = (state, startLine, endLine, silent) => {
	if (startLine !== 0) return false;
	if (lineAt(state, 0).replace(/^﻿/, '') !== '---') return false;

	let closing = -1;
	for (let line = 1; line < endLine; line += 1) {
		const text = lineAt(state, line);
		if (text === '---' || text === '...') {
			closing = line;
			break;
		}
	}
	if (closing < 0) return false;
	if (silent) return true;

	const yaml = state.getLines(1, closing, state.blkIndent, false);
	pushHtml(
		state,
		'<details class="frontmatter-block">' +
			'<summary>文章属性（Frontmatter）</summary>' +
			`<pre class="frontmatter-source">${escapeHtml(yaml)}</pre></details>\n`,
	);
	state.line = closing + 1;
	return true;
};

const foldRule: RuleBlock = (state, startLine, endLine, silent) => {
	const attributes = matchDirective(state, startLine, 'fold');
	if (!attributes) return false;
	const closing = findClosing(state, startLine + 1, endLine);
	if (closing < 0) return false;
	if (silent) return true;

	const summary = (attributes.summary ?? '').trim() || '展开 / 收起';
	const inner = state.getLines(startLine + 1, closing, state.blkIndent, true);
	pushHtml(state, `<details class="fold">\n<summary>${escapeHtml(summary)}</summary>\n`);
	state.md.block.parse(inner, state.md, state.env, state.tokens);
	pushHtml(state, '</details>\n');
	state.line = closing + 1;
	return true;
};

interface TabPanel {
	title: string;
	inner: string;
}

const tabsRule: RuleBlock = (state, startLine, endLine, silent) => {
	if (!matchDirective(state, startLine, 'tab')) return false;

	const panels: TabPanel[] = [];
	let cursor = startLine;
	let consumed = startLine;

	while (cursor < endLine) {
		const attributes = matchDirective(state, cursor, 'tab');
		if (!attributes) break;
		const closing = findClosing(state, cursor + 1, endLine);
		if (closing < 0) break;
		panels.push({
			title: (attributes.title ?? '').trim() || '标签页',
			inner: state.getLines(cursor + 1, closing, state.blkIndent, true),
		});
		consumed = closing + 1;
		const probe = skipBlankLines(state, consumed, endLine);
		if (probe < endLine && matchDirective(state, probe, 'tab')) {
			cursor = probe;
		} else {
			break;
		}
	}

	if (panels.length === 0) return false;
	if (silent) return true;

	pushHtml(state, '<div class="tab-group">\n');
	for (const panel of panels) {
		pushHtml(state, `<div class="tab-panel" data-title="${escapeHtml(panel.title)}">\n`);
		state.md.block.parse(panel.inner, state.md, state.env, state.tokens);
		pushHtml(state, '</div>\n');
	}
	pushHtml(state, '</div>\n');
	state.line = consumed;
	return true;
};

const encryptedRule: RuleBlock = (state, startLine, endLine, silent) => {
	if (!matchDirective(state, startLine, 'encrypted')) return false;
	const closing = findClosing(state, startLine + 1, endLine);
	if (closing < 0) return false;
	if (silent) return true;

	pushHtml(
		state,
		'<div class="encrypted-placeholder" role="note">' +
			'<strong>加密内容</strong><span>编辑器预览不显示加密正文。</span></div>\n',
	);
	// Do not parse the inner text: the preview must not leak ciphertext/plaintext.
	state.line = closing + 1;
	return true;
};

function findBlockquoteClose(tokens: MdToken[], openIndex: number): number {
	const level = tokens[openIndex].level;
	for (let index = openIndex + 1; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token.type === 'blockquote_close' && token.level === level) return index;
	}
	return -1;
}

function firstParagraph(tokens: MdToken[], from: number, to: number): number {
	for (let index = from; index < to; index += 1) {
		if (tokens[index].type === 'paragraph_open') return index;
	}
	return -1;
}

function isInlineEmpty(children: MdToken[] | null): boolean {
	if (!children || children.length === 0) return true;
	return children.every(
		(child) =>
			(child.type === 'text' && child.content.trim() === '') ||
			child.type === 'softbreak' ||
			child.type === 'hardbreak',
	);
}

function stripAlertMarker(state: StateCore, inline: MdToken): boolean {
	const stripped = inline.content.replace(ALERT_MARKER, '');
	inline.content = stripped;
	const parsed = state.md.parseInline(stripped, state.env);
	inline.children = parsed.length > 0 ? (parsed[0].children ?? []) : [];
	return isInlineEmpty(inline.children);
}

const alertRule: RuleCore = (state) => {
	const output: MdToken[] = [];
	const tokens = state.tokens;

	for (let index = 0; index < tokens.length; index += 1) {
		const open = tokens[index];
		if (open.type !== 'blockquote_open') {
			output.push(open);
			continue;
		}

		const closeIndex = findBlockquoteClose(tokens, index);
		if (closeIndex < 0) {
			output.push(open);
			continue;
		}
		const paragraphIndex = firstParagraph(tokens, index + 1, closeIndex);
		if (paragraphIndex < 0) {
			output.push(open);
			continue;
		}
		const inline = tokens[paragraphIndex + 1];
		if (!inline || inline.type !== 'inline') {
			output.push(open);
			continue;
		}

		const marker = ALERT_MARKER.exec(inline.content);
		if (!marker) {
			output.push(open);
			continue;
		}

		const alertType = marker[1].toLowerCase();
		open.tag = 'div';
		open.attrJoin('class', `markdown-alert markdown-alert-${alertType}`);
		open.attrSet('dir', 'auto');
		output.push(open);
		// Match remark-github-blockquote-alert's default `<div>` container.
		tokens[closeIndex].tag = 'div';

		const title = new state.Token('html_block', '', 0);
		title.block = true;
		title.content =
			`<p class="markdown-alert-title" dir="auto">${ALERT_ICON}${escapeHtml(alertType.toUpperCase())}</p>\n`;
		output.push(title);

		const emptyParagraph = stripAlertMarker(state, inline);
		for (let scan = index + 1; scan < closeIndex; scan += 1) {
			if (emptyParagraph && scan >= paragraphIndex && scan < paragraphIndex + 3) continue;
			output.push(tokens[scan]);
		}
		output.push(tokens[closeIndex]);
		index = closeIndex;
	}

	state.tokens = output;
};

function rewriteCdnUrl(value: string): string | null {
	if (!previewPostId || !BARE_IMAGE.test(value)) return null;
	return `${CDN_BASE}/${encodeURI(previewPostId)}/${encodeURI(value)}`;
}

const cdnImageRule: RuleCore = (state) => {
	if (!previewPostId) return;
	for (const token of state.tokens) {
		if (token.type !== 'inline' || !token.children) continue;
		for (const child of token.children) {
			if (child.type === 'image') {
				const source = child.attrGet('src');
				if (!source) continue;
				const rewritten = rewriteCdnUrl(source);
				if (rewritten) child.attrSet('src', rewritten);
			} else if (child.type === 'link_open') {
				const href = child.attrGet('href');
				if (!href) continue;
				const rewritten = rewriteCdnUrl(href);
				if (rewritten) child.attrSet('href', rewritten);
			}
		}
	}
};

/** Register all preview plugins on md-editor-rt's markdown-it instance. */
export function configureMarkdownIt(md: MarkdownIt): void {
	const options = { alt: ['paragraph', 'reference', 'blockquote', 'list'] };
	md.block.ruler.before('hr', 'koharu_frontmatter', frontmatterRule, options);
	md.block.ruler.before('fence', 'koharu_fold', foldRule, options);
	md.block.ruler.before('fence', 'koharu_tabs', tabsRule, options);
	md.block.ruler.before('fence', 'koharu_encrypted', encryptedRule, options);
	md.core.ruler.push('koharu_alerts', alertRule);
	md.core.ruler.push('koharu_cdn_images', cdnImageRule);
}
