import { visit } from 'unist-util-visit';

/**
 * Rehype plugin (operates on HAST) — enhances markdown images:
 *
 *  - Standalone images are wrapped in `<figure class="md-figure">`; if the
 *    image has non-empty alt text, a `<figcaption class="md-figcaption">`
 *    holding that text is added as a sibling. Every image gains
 *    `loading="lazy"` and `decoding="async"`, plus the `md-image` class.
 *  - Images that are already wrapped in an `<a>` (image-as-link) are left
 *    in place structurally and only receive lazy/async loading.
 *  - Images already inside a `<figure>` are skipped (no double-wrap).
 *
 * Then a second pass unwraps `<p>` elements whose meaningful content is one
 * or more `<figure>` elements — a `<figure>` is not a valid child of `<p>`,
 * and markdown parsers will otherwise wrap a loose image in a paragraph.
 */
type Node = any;

export function rehypeFigure() {
	return (tree: Node) => {
		// Pass 1 — enhance <img>: lazy/async for all, wrap standalone ones.
		visit(tree, 'element', (node: Node, index: number | undefined, parent: Node) => {
			if (node.tagName !== 'img') return;
			if (index === undefined || !parent) return;
			if (parent.tagName === 'figure') return;

			if (parent.tagName === 'a') {
				node.properties = { ...node.properties, loading: 'lazy', decoding: 'async' };
				return;
			}

			const existingClass = Array.isArray(node.properties?.class)
				? node.properties.class.join(' ')
				: (node.properties?.class ?? '');
			node.properties = {
				...node.properties,
				loading: 'lazy',
				decoding: 'async',
				class: `${existingClass} md-image`.trim(),
			};

			const alt =
				typeof node.properties?.alt === 'string' ? node.properties.alt.trim() : '';

			const caption: Node | null = alt
				? {
						type: 'element',
						tagName: 'figcaption',
						properties: { class: 'md-figcaption' },
						children: [{ type: 'text', value: alt }],
					}
				: null;

			const wrapper: Node = {
				type: 'element',
				tagName: 'figure',
				properties: { class: 'md-figure' },
				children: caption ? [node, caption] : [node],
			};

			parent.children[index] = wrapper;
		});

		// Pass 2 — unwrap <p> elements that contain only <figure> children.
		visit(tree, 'element', (node: Node, index: number | undefined, parent: Node) => {
			if (node.tagName !== 'p') return;
			if (index === undefined || !parent) return;

			const meaningful = node.children.filter(
				(c: Node) => !(c.type === 'text' && c.value.trim() === ''),
			);

			if (
				meaningful.length > 0 &&
				meaningful.every(
					(c: Node) => c.type === 'element' && c.tagName === 'figure',
				)
			) {
				parent.children.splice(index, 1, ...node.children);
			}
		});
	};
}
