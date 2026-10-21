import { visit } from 'unist-util-visit';

/**
 * Remark plugin — must run AFTER `remark-directive`.
 *
 * `remark-directive` parses *container* directives (`:::fold`, `:::tab`), which
 * this site uses, but it also parses *text* and *leaf* directives — so any plain
 * colon in prose turns into markup:
 *
 *   `14:00 UTC`  ->  text "14" + empty textDirective "00" + text " UTC"
 *   `std::string` ->  text "std" + leafDirective "string"
 *
 * A directive node without `data.hName` renders as an empty block element
 * (`<div></div>`), which splits the paragraph in two and silently swallows the
 * characters after the colon. That is why "原定 … 14:00 UTC 协调披露" used to
 * break mid-sentence.
 *
 * Since the only directives this blog understands are containers, any text or
 * leaf directive is by definition not markup: put the literal source text back.
 * Colons (timestamps, `std::`, `re:` prefixes, …) then survive with no need to
 * escape them in the article source.
 *
 * (`\:00` still works as an escape — that never reaches this plugin.)
 */
type Node = any;

export function remarkDirectiveText() {
	return (tree: Node, file: Node) => {
		const source = typeof file?.value === 'string' ? file.value : '';
		// Decrypted posts are re-parsed from the decrypted body (remarkDecrypt),
		// so their node offsets do not address `file.value` — rebuild those from
		// the node instead of slicing the wrong string.
		const offsetsAreInFile = !file?.data?.__enc;
		visit(tree, (node: Node, index: number | undefined, parent: Node) => {
			if (node.type !== 'textDirective' && node.type !== 'leafDirective') return;
			if (!parent?.children || typeof index !== 'number') return;
			const value = literal(node, offsetsAreInFile ? source : '');
			parent.children.splice(index, 1, { type: 'text', value });
		});
	};
}

/** Recover the exact `:name[label]{attrs}` the author typed. */
function literal(node: Node, source: string): string {
	const start = node.position?.start?.offset;
	const end = node.position?.end?.offset;
	if (source && start != null && end != null) {
		const slice = source.slice(start, end);
		// Offsets are relative to the parsed document. Decrypted posts are
		// re-parsed from the decrypted body (see remarkDecrypt), so their offsets
		// do not address `file.value`; only trust a slice that really is this
		// directive, otherwise fall through to rebuilding it from the node.
		if (slice.startsWith(':') && slice.includes(node.name)) return slice;
	}

	let out = ':' + (node.name ?? '');
	if (Array.isArray(node.children) && node.children.length > 0) {
		out += '[' + node.children.map((child: Node) => child.value ?? '').join('') + ']';
	}
	const entries = Object.entries(node.attributes ?? {});
	if (entries.length > 0) {
		out += '{' + entries.map(([key, value]) => `${key}="${value}"`).join(' ') + '}';
	}
	return out;
}
