/**
 * Remark plugin (run AFTER remark-directive) — groups consecutive `tab`
 * container directives into a tab group. The buttons are generated
 * client-side from each panel's `data-title` (see the BlogPost script).
 *
 *   :::tab{title="Linux"}
 *   apt install foo
 *   :::
 *   :::tab{title="Windows"}
 *   winget install foo
 *   :::
 *
 * Output:
 *   <div class="tab-group">
 *     <div class="tab-panel" data-title="Linux">…</div>
 *     <div class="tab-panel" data-title="Windows">…</div>
 *   </div>
 *
 * We deliberately DON'T require an outer `:::tabs` wrapper: remark-directive
 * can't reliably nest two `:::` containers, so consecutive `:::tab` blocks
 * auto-group instead. Without JS every panel is visible (stacked) — an
 * acceptable graceful state.
 */
type Node = any;

export function remarkTabs() {
	const walk = (node: Node) => {
		if (!Array.isArray(node.children)) return;
		const next: Node[] = [];
		const kids = node.children;
		let i = 0;
		while (i < kids.length) {
			const kid = kids[i];
			if (kid.type === 'containerDirective' && kid.name === 'tab') {
				// Collect the maximal run of consecutive `:::tab` siblings.
				const run: Node[] = [];
				while (
					i < kids.length &&
					kids[i].type === 'containerDirective' &&
					kids[i].name === 'tab'
				) {
					const tab = kids[i];
					tab.data = tab.data || {};
					tab.data.hName = 'div';
					tab.data.hProperties = {
						className: ['tab-panel'],
						'data-title': String(tab.attributes?.title ?? '').trim() || '标签页',
					};
					run.push(tab);
					i++;
				}
				next.push({
					type: 'containerDirective',
					name: 'tabs',
					data: { hName: 'div', hProperties: { className: ['tab-group'] } },
					children: run,
				});
				// Recurse into each panel's own children (for nested content).
				run.forEach(walk);
			} else {
				next.push(kid);
				walk(kid);
				i++;
			}
		}
		node.children = next;
	};
	return (tree: Node) => walk(tree);
}
