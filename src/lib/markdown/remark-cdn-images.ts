import { visit } from 'unist-util-visit';
import { basename } from 'node:path';

/**
 * Remark plugin — rewrites bare-filename image (and image-link) URLs to a
 * versioned CDN URL, scoped to the article's leading sequence number.
 *
 *   ![](1.webp)             →  https://static.ski.ink/blog-uploads/<seq>/images/1.webp
 *   ![说明](1.webp)          →  same, alt preserved
 *   [![](1.webp)](1.webp)   →  click-to-enlarge link + image both resolved
 *   ![](https://…)          →  left as-is
 *   ![](/local.png)         →  left as-is
 *
 * `<seq>` is the leading integer of the source filename
 * (e.g. `10-world-of-warships-beginner-guide.md` → `10`), matching the
 * blog's naming convention. Files without a leading number are skipped.
 *
 * Both `image` src and `link` href are rewritten when they are a bare
 * filename with an image extension, so the click-to-enlarge idiom works.
 *
 * Rewriting happens at the mdast (remark) layer, so by the time Astro's
 * markdown image pipeline runs as rehype the URL is already a full https
 * URL — Astro treats it as remote and skips bundling/optimization, which
 * is exactly what we want for CDN-hosted assets.
 */
type Node = any;

const CDN_BASE = 'https://static.ski.ink/blog-uploads';
// A bare filename with an image extension — no scheme, no path separators.
const BARE_IMAGE = /^[\w.\-+ ]+\.(webp|png|jpe?g|gif|svg|avif|bmp|ico)$/i;

export function remarkCdnImages() {
	return (tree: Node, file: { path?: string; data?: any }) => {
		const match = basename(file.path ?? '').match(/^(\d+)/);
		if (!match) return; // not a numbered article — leave URLs untouched
		const seq = match[1];
		const rewrite = (node: Node) => {
			const url = typeof node.url === 'string' ? node.url : '';
			if (!url || !BARE_IMAGE.test(url)) return;
			node.url = `${CDN_BASE}/${seq}/images/${encodeURI(url)}`;
		};
		visit(tree, 'image', rewrite);
		visit(tree, 'link', rewrite);
	};
}
