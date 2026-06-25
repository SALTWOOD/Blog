/**
 * Isomorphic base64 <-> ArrayBuffer helpers.
 *
 * Used by every runtime (Node CLI, Astro build, browser), so they must not pull
 * in Node-only (`Buffer`) or browser-only (`btoa`/`atob`) globals at import
 * time. Each helper picks whichever is available at call time.
 */

/** ArrayBuffer (or typed-array view) -> base64 string. */
export function bytesToBase64(input: ArrayBuffer | Uint8Array): string {
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	// Node path — fast, and avoids `RangeError` on `btoa` for large buffers
	// (btoa's String path blows the call stack on multi-megabyte inputs).
	const g: typeof globalThis & { Buffer?: { from(d: Uint8Array, enc: 'base64'): { toString(enc: 'base64'): string } } } = globalThis as never;
	if (g.Buffer) return g.Buffer.from(bytes, 'base64').toString('base64');

	let binary = '';
	const chunk = 0x8000; // keep fromCharCode under the argument limit
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
}

/** base64 string -> fresh ArrayBuffer. */
export function base64ToBytes(base64: string): ArrayBuffer {
	const g: typeof globalThis & { Buffer?: { from(s: string, enc: 'base64'): Uint8Array } } = globalThis as never;
	if (g.Buffer) {
		const buf = g.Buffer.from(base64, 'base64');
		// Copy into a standalone ArrayBuffer so crypto.subtle gets a clean
		// backing store (Buffer slices share an oversized pool).
		return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
	}

	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes.buffer;
}
