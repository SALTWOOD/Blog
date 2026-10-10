import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import remarkDirective from 'remark-directive';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { decryptString, importPrivateKey, unwrapDataKey } from '../crypto';

type Node = any;

interface EncFrontmatter {
	encrypted?: boolean;
	encMd?: string;
	wrappedKey?: string;
	ivMd?: string;
}
interface EncFileData {
	astro?: { frontmatter?: EncFrontmatter };
	__enc?: { dataKey: CryptoKey; wrappedKey: string };
}

let keyPromise: Promise<CryptoKey> | null = null;

function readPrivateKeyPem(): string {
	const inline = process.env.BLOG_PRIVATE_KEY;
	if (inline && inline.trim()) return inline;
	const file = process.env.BLOG_PRIVATE_KEY_FILE ?? resolve(process.cwd(), '.blog-private.pem');
	if (existsSync(file)) return readFileSync(file, 'utf8');
	throw new Error(
		'[encrypted-posts] Found an encrypted post but no build key is available.\n' +
			'  Set BLOG_PRIVATE_KEY (PEM string) or BLOG_PRIVATE_KEY_FILE (path),\n' +
			'  or place the private key at .blog-private.pem in the repo root, then rebuild.',
	);
}

/** Lazily import + memoize the build's private key. */
function getBuildPrivateKey(): Promise<CryptoKey> {
	if (!keyPromise) keyPromise = importPrivateKey(readPrivateKeyPem());
	return keyPromise;
}

export function remarkDecrypt() {
	return async (tree: Node, file: Node) => {
		const data: EncFileData = file.data ?? (file.data = {});
		const fm = data.astro?.frontmatter;
		if (!fm?.encrypted || !fm.encMd || !fm.wrappedKey || !fm.ivMd) return;

		const privateKey = await getBuildPrivateKey();

		let dataKey: CryptoKey;
		try {
			dataKey = await unwrapDataKey(fm.wrappedKey, privateKey);
		} catch {
			throw new Error(
				`[encrypted-posts] Could not unwrap the data key for "${file.path ?? 'post'}".\n` +
					'  The build private key does not match the public key that encrypted this article.',
			);
		}

		const markdown = await decryptString(fm.encMd, dataKey, fm.ivMd);
		if (markdown == null) {
			throw new Error(
				`[encrypted-posts] Could not decrypt the body of "${file.path ?? 'post'}" (ciphertext is corrupt or truncated).`,
			);
		}

		const reparsed = unified().use(remarkParse).use(remarkDirective).parse(markdown);
		tree.children = reparsed.children;

		// Hand off to the rehype stage so it can re-encrypt the rendered HTML.
		data.__enc = { dataKey, wrappedKey: fm.wrappedKey };
	};
}
