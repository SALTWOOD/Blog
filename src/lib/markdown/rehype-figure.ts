import { visit } from 'unist-util-visit';

/**
 * Rehype plugin — wraps standalone markdown images in a `<figure>` with a
 * `<figcaption>` derived from the alt text (the "framed chart" treatment),
 * and adds lazy/async loading. Linked images just get lazy/async.
 *
 * Ported (trimmed) from koharu's rehype-image-placeholder: we keep figure
 * wrapping + the <p>-unwrap pass (a <figure> can't live inside a <p>), and
 * drop the LQIP/placeholder machinery.
 */
type Node = any;

export function rehypeFigure() {
	return (tree: Node) => {
		visit(tree, 'element', (node: Node, index: number | undefined, parent: Node) => {
			if (node.tagName !== 'img') return;
			if (index === undefined || !parent) return;
			// Skip images already wrapped (e.g. inside another figure).
			if (parent.type === 'element' && parent.tagName === 'figure') return;

			// Images inside <a>: keep the link intact, just lazy-load.
			if (parent.type === 'element' && parent.tagName === 'a') {
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

			const alt = typeof node.properties?.alt === 'string' ? node.properties.alt.trim() : '';
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

		// Second pass: unwrap `<p>` that only contains <figure> elements —
		// a <figure> nested in a <p> is invalid HTML and breaks grouping.
		visit(tree, 'element', (node: Node, index: number | undefined, parent: Node) => {
			if (node.tagName !== 'p' || index === undefined || !parent) return;
			const meaningful = node.children.filter(
				(c: Node) => !(c.type === 'text' && c.value.trim() === ''),
			);
			if (
				meaningful.length > 0 &&
				meaningful.every((c: Node) => c.type === 'element' && c.tagName === 'figure')
			) {
				parent.children.splice(index, 1, ...node.children);
			}
		});
	};
}
