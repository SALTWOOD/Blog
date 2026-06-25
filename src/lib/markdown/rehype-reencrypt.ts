import { toHtml } from 'hast-util-to-html';
import { bytesToBase64, encryptString, generateIV } from '../crypto';

/**
 * Rehype plugin — registered LAST in the rehype chain.
 *
 * If the post was decrypted by {@link remarkDecrypt} (signalled by
 * `file.data.__enc`), this serializes the fully-rendered HAST back to HTML and
 * re-encrypts it with the same data key, replacing the whole tree with a single
 * inert `<div class="encrypted-post">` that carries only ciphertext.
 *
 * The browser supplies the RSA private key to unwrap the data key and decrypt.
 * `data-pagefind-ignore` keeps the ciphertext out of the search index.
 *
 * Must run after every other rehype plugin (Shiki, KaTeX, rehype-figure, …) so
 * the encrypted blob is the final, fully-rendered HTML.
 */
type Node = any;

interface EncFileData {
	__enc?: { dataKey: CryptoKey; wrappedKey: string };
}

export function rehypeReencrypt() {
	return async (tree: Node, file: Node) => {
		const data: EncFileData = file.data ?? {};
		const enc = data.__enc;
		if (!enc) return;

		// `allowDangerousHtml` so any raw-HTML fragments in the source survive
		// into the blob — they're re-injected via innerHTML after decrypt anyway.
		const html = toHtml(tree, { allowDangerousHtml: true });
		const iv = generateIV();

		tree.children = [
			{
				type: 'element',
				tagName: 'div',
				properties: {
					className: ['encrypted-post'],
					// HAST serializes these camelCase data-* props as data-cipher etc.
					dataCipher: await encryptString(html, enc.dataKey, iv),
					dataWrapped: enc.wrappedKey,
					dataIv: bytesToBase64(iv),
					dataPagefindIgnore: '',
				},
				children: [],
			},
		];

		delete data.__enc;
	};
}
