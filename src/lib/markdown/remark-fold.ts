import { visit } from 'unist-util-visit';

/**
 * Remark plugin (run AFTER remark-directive) — turns a `fold` container
 * directive into a native `<details>`:
 *
 *   :::fold{summary="可选的展开标题"}
 *   被折叠的内容
 *   :::
 *
 * Uses `data.hName` / `data.hProperties` so remark-rehype renders the right
 * tags — no raw HTML, no client JS.
 */
type Node = any;

export function remarkFold() {
	return (tree: Node) => {
		visit(tree, (node: Node) => {
			if (node.type !== 'containerDirective' || node.name !== 'fold') return;
			const summary = (node.attributes?.summary ?? '').toString().trim() || '展开 / 收起';
			node.data = node.data || {};
			node.data.hName = 'details';
			node.data.hProperties = { className: ['fold'] };
			node.children = [
				{
					type: 'paragraph',
					data: { hName: 'summary' },
					children: [{ type: 'text', value: summary }],
				},
				...node.children,
			];
		});
	};
}
