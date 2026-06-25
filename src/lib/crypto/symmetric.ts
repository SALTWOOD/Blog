/**
 * Symmetric encryption: AES-256-GCM for article bodies / rendered HTML.
 *
 * Pure Web Crypto — no third-party crypto library. Runs unchanged in the Node
 * CLI, the Astro build, and the browser.
 */
import { AES_IV_BYTES, AES_KEY_LENGTH } from './constants';
import { base64ToBytes, bytesToBase64 } from './base64';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** `crypto.subtle` is global in Node 18+ and in every browser. */
const subtle = globalThis.crypto.subtle;

/** A fresh, extractable AES-256-GCM key (extractable so its raw bytes can be
 *  wrapped by the RSA public key). */
export function generateDataKey(): Promise<CryptoKey> {
	return subtle.generateKey({ name: 'AES-GCM', length: AES_KEY_LENGTH }, true, ['encrypt', 'decrypt']);
}

/** A fresh 96-bit GCM IV. */
export function generateIV(): Uint8Array {
	return globalThis.crypto.getRandomValues(new Uint8Array(AES_IV_BYTES));
}

/** Encrypt a UTF-8 string. Returns the base64 ciphertext; the IV is returned
 *  separately (callers store it alongside). */
export async function encryptString(plaintext: string, key: CryptoKey, iv: Uint8Array): Promise<string> {
	const cipher = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
	return bytesToBase64(cipher);
}

/** Decrypt a base64 ciphertext that was produced by {@link encryptString}.
 *  Returns `null` on failure (wrong key / truncated / tampered) so callers can
 *  treat a bad password/key as "wrong" rather than throwing. */
export async function decryptString(cipherBase64: string, key: CryptoKey, ivBase64: string): Promise<string | null> {
	try {
		const plain = await subtle.decrypt(
			{ name: 'AES-GCM', iv: new Uint8Array(base64ToBytes(ivBase64)) },
			key,
			base64ToBytes(cipherBase64),
		);
		return decoder.decode(plain);
	} catch {
		return null;
	}
}

/** Export an AES key to its 32 raw bytes (for RSA wrapping). */
export function exportRawKey(key: CryptoKey): Promise<ArrayBuffer> {
	return subtle.exportKey('raw', key);
}

/** Reconstitute an AES-256-GCM key from raw bytes (the RSA-unwrap result). */
export function importRawKey(raw: ArrayBuffer): Promise<CryptoKey> {
	return subtle.importKey('raw', raw, { name: 'AES-GCM', length: AES_KEY_LENGTH }, false, ['encrypt', 'decrypt']);
}
