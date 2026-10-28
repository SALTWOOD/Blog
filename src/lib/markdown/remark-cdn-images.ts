import { visit } from 'unist-util-visit';
import { basename } from 'node:path';

type Node = any;

const CDN_BASE = 'https://blog-uploads.ski.ink';
// A bare filename with an image extension — no scheme, no path separators.
const BARE_IMAGE = /^[\w.\-+ ]+\.(webp|png|jpe?g|gif|svg|avif|bmp|ico)$/i;

export function remarkCdnImages() {
	return (tree: Node, file: { path?: string; data?: any }) => {
		const id = basename(file.path ?? '').replace(/\.mdx?$/i, '');
		if (!id) return;

		const rewrite = (node: Node) => {
			const url = typeof node.url === 'string' ? node.url : '';
			if (!url || !BARE_IMAGE.test(url)) return;
			node.url = `${CDN_BASE}/${id}/${encodeURI(url)}`;
		};
		visit(tree, 'image', rewrite);
		visit(tree, 'link', rewrite);
	};
}
