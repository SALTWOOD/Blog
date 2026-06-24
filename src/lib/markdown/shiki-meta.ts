import type { ShikiTransformer } from 'shiki';

/**
 * Shiki transformer — parses a code fence's meta string for our two supported
 * hints and exposes them to CSS:
 *   ```js title="app.ts" mark:1,3-5
 *     `title=`  → a filename header bar above the block (data-title on <pre>)
 *     `mark:`   → highlighted lines (a `line-mark` class on the <span>)
 *
 * Trimmed from koharu's shoka-meta-transformer (we don't need url/command).
 */
interface CodeMeta {
	title?: string;
	mark?: string;
}

function parseMeta(meta: string | undefined): CodeMeta | null {
	if (!meta) return null;
	const result: CodeMeta = {};
	const titleMatch = meta.match(/title="([^"]*)"/);
	if (titleMatch) result.title = titleMatch[1];
	const markMatch = meta.match(/mark:([\d,-]+)/);
	if (markMatch) result.mark = markMatch[1];
	if (!result.title && !result.mark) return null;
	return result;
}

function expandRanges(rangeStr: string): Set<number> {
	const lines = new Set<number>();
	for (const part of rangeStr.split(',')) {
		const trimmed = part.trim();
		if (trimmed.includes('-')) {
			const [start, end] = trimmed.split('-').map(Number);
			for (let i = start; i <= end; i++) lines.add(i);
		} else {
			lines.add(Number(trimmed));
		}
	}
	return lines;
}

export function shikiMetaTransformer(): ShikiTransformer {
	// Cache per-block so we don't re-parse the meta on every line callback.
	let cachedRaw: string | undefined;
	let cachedMeta: CodeMeta | null = null;
	let cachedMarks: Set<number> | null = null;

	function load(raw: string | undefined) {
		if (raw === cachedRaw) return;
		cachedRaw = raw;
		cachedMeta = parseMeta(raw);
		cachedMarks = cachedMeta?.mark ? expandRanges(cachedMeta.mark) : null;
	}

	return {
		name: 'logbook-meta',
		pre(node) {
			cachedRaw = undefined; // reset between blocks
			load(this.options.meta?.__raw);
			if (cachedMeta?.title) node.properties['data-title'] = cachedMeta.title;
		},
		line(node, line) {
			load(this.options.meta?.__raw);
			if (cachedMarks?.has(line)) {
				const cls = node.properties.class;
				const base = Array.isArray(cls) ? cls.join(' ') : (cls ?? '');
				node.properties.class = `${base} line-mark`.trim();
			}
		},
	};
}
