import type { ShikiTransformer } from 'shiki';

/**
 * Shiki transformer — reads two optional hints from a fenced code block's
 * meta string and surfaces them to CSS:
 *
 *   ```ts title="app.ts" mark:1,3-5
 *   ...
 *   ```
 *
 *  - `title="..."` becomes `data-title` on the `<pre>`, rendered as a
 *    filename header bar by the stylesheet.
 *  - `mark:1,3-5` highlights the given lines (single numbers and inclusive
 *    ranges); those line `<span>`s receive a `line-mark` class.
 *
 * Meta parsing is memoised at module scope so the per-line callback doesn't
 * re-run the regex on every line of every block.
 */
type Node = any;

/** Parsed meta hints, or null when neither is present. */
type ParsedMeta = { title?: string; mark?: Set<number> } | null;

let cachedRaw: string | undefined;
let cachedMeta: { title?: string } | undefined;
let cachedMarks: Set<number> | undefined;

/** Parse `title="..."` and `mark:1,3-5` out of the meta string. */
function parseMeta(meta: string | undefined): ParsedMeta {
	if (!meta) return null;
	const titleMatch = meta.match(/title="([^"]*)"/);
	const markMatch = meta.match(/mark:([\d,-]+)/);
	if (!titleMatch && !markMatch) return null;
	const result: { title?: string; mark?: Set<number> } = {};
	if (titleMatch) result.title = titleMatch[1];
	if (markMatch) result.mark = expandRanges(markMatch[1]);
	return result;
}

/** Turn a range string like `1,3-5` into a Set<number>. */
function expandRanges(rangeStr: string): Set<number> {
	const out = new Set<number>();
	for (const part of rangeStr.split(',')) {
		const trimmed = part.trim();
		if (!trimmed) continue;
		if (trimmed.includes('-')) {
			const [startStr, endStr] = trimmed.split('-');
			const start = Number(startStr);
			const end = Number(endStr);
			if (Number.isFinite(start) && Number.isFinite(end)) {
				const lo = Math.min(start, end);
				const hi = Math.max(start, end);
				for (let i = lo; i <= hi; i++) out.add(i);
			}
		} else {
			const n = Number(trimmed);
			if (Number.isFinite(n)) out.add(n);
		}
	}
	return out;
}

/** Re-parse only when the raw meta string changes. */
function load(raw: string | undefined): void {
	if (raw === cachedRaw) return;
	cachedRaw = raw;
	const parsed = parseMeta(raw);
	cachedMeta = parsed ? { title: parsed.title } : undefined;
	cachedMarks = parsed?.mark;
}

export function shikiMetaTransformer(): ShikiTransformer {
	return {
		name: 'logbook-meta',
		pre(node: Node) {
			cachedRaw = undefined;
			load(this.options.meta?.__raw);
			if (cachedMeta?.title) {
				node.properties = node.properties || {};
				node.properties['data-title'] = cachedMeta.title;
			}
		},
		line(node: Node, line: number) {
			load(this.options.meta?.__raw);
			if (!cachedMarks?.has(line)) return;
			const cls = node.properties?.class;
			const base = Array.isArray(cls) ? cls.join(' ') : (cls ?? '');
			node.properties = node.properties || {};
			node.properties.class = `${base} line-mark`.trim();
		},
	};
}
