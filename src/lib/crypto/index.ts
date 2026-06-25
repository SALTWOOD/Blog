/**
 * Article-encryption crypto core — pure Web Crypto, shared by:
 *   - the Node CLI (`scripts/cli.mjs`): encrypt/decrypt article bodies
 *   - the Astro build: decrypt for rendering, re-encrypt for the browser
 *   - the browser (`EncryptedGate.astro`): final decrypt with the reader's key
 *
 * No Node-only APIs (fs / process) live here, so it bundles cleanly into the
 * browser. See {@link './constants.ts'} for the scheme parameters.
 */
export * from './constants';
export { base64ToBytes, bytesToBase64 } from './base64';
export {
	decryptString,
	encryptString,
	exportRawKey,
	generateDataKey,
	generateIV,
	importRawKey,
} from './symmetric';
export {
	generateKeyPairPems,
	importPrivateKey,
	importPublicKey,
	unwrapDataKey,
	wrapDataKey,
	type KeyPairPems,
} from './keys';
