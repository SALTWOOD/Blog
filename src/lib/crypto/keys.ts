/**
 * Asymmetric key handling: RSA-OAEP-4096 key pair, PEM (de)serialization, and
 * data-key wrap / unwrap (the "envelope").
 *
 * The RSA key pair is site-wide: the public key lives in the repo
 * (`src/keys/public.pem`), the private key never does. Readers supply the
 * private key in the browser; the build uses an off-repo copy to decrypt for
 * rendering.
 *
 * PEM handling here is pure string work — no filesystem, no `process.env` — so
 * this module is safe to bundle into the browser. Node-specific concerns (where
 * to read key files from) live in the callers, not here.
 */
import { RSA_HASH_ALGORITHM, RSA_MODULUS_LENGTH, RSA_PUBLIC_EXPONENT } from './constants';
import { base64ToBytes, bytesToBase64 } from './base64';
import { exportRawKey, importRawKey } from './symmetric';

const subtle = globalThis.crypto.subtle;

const rsaAlgorithm = { name: 'RSA-OAEP', hash: RSA_HASH_ALGORITHM } as const;

/** Strip PEM armor (headers, newlines, spaces) and base64-decode the body. */
function pemToBytes(pem: string): ArrayBuffer {
	const body = pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '');
	return base64ToBytes(body);
}

/** Wrap a byte buffer in PEM armor, line-wrapped at 64 chars (OpenSSL style). */
function bytesToPem(buf: ArrayBuffer, label: string): string {
	const b64 = bytesToBase64(buf);
	const lines = b64.match(/.{1,64}/g) ?? [b64];
	return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

export interface KeyPairPems {
	publicKeyPem: string;
	privateKeyPem: string;
}

/** Generate a new RSA-OAEP-4096 key pair and return both halves as PEM. */
export async function generateKeyPairPems(): Promise<KeyPairPems> {
	const pair = await subtle.generateKey(
		{
			name: 'RSA-OAEP',
			modulusLength: RSA_MODULUS_LENGTH,
			publicExponent: RSA_PUBLIC_EXPONENT,
			hash: RSA_HASH_ALGORITHM,
		},
		true,
		['encrypt', 'decrypt'],
	);
	const [publicKey, privateKey] = await Promise.all([
		subtle.exportKey('spki', pair.publicKey),
		subtle.exportKey('pkcs8', pair.privateKey),
	]);
	return {
		publicKeyPem: bytesToPem(publicKey, 'PUBLIC KEY'),
		privateKeyPem: bytesToPem(privateKey, 'PRIVATE KEY'),
	};
}

/** Import a PEM (SPKI) public key, configured to wrap data keys. */
export function importPublicKey(pem: string): Promise<CryptoKey> {
	return subtle.importKey('spki', pemToBytes(pem), rsaAlgorithm, true, ['encrypt']);
}

/** Import a PEM (PKCS#8) private key, configured to unwrap data keys. */
export function importPrivateKey(pem: string): Promise<CryptoKey> {
	return subtle.importKey('pkcs8', pemToBytes(pem), rsaAlgorithm, true, ['decrypt']);
}

/** Wrap (RSA-OAEP encrypt) a symmetric data key with the public key. Returns
 *  base64. The result is what gets stored in the article frontmatter. */
export async function wrapDataKey(dataKey: CryptoKey, publicKey: CryptoKey): Promise<string> {
	const raw = await exportRawKey(dataKey);
	const wrapped = await subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, raw);
	return bytesToBase64(wrapped);
}

/** Unwrap a base64-wrapped data key with the private key, returning a ready-to-
 *  use AES-256-GCM CryptoKey. */
export async function unwrapDataKey(wrappedBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
	const raw = await subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, base64ToBytes(wrappedBase64));
	return importRawKey(raw);
}
