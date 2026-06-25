/**
 * Shared cryptographic parameters for the article-encryption feature.
 *
 * Envelope scheme: each article body is encrypted with a fresh symmetric
 * AES-256-GCM data key, and that data key is itself wrapped (encrypted) with a
 * site-wide RSA-OAEP key pair. Only the RSA public key ever lives in the
 * repository; the private key stays off-repo and is what readers supply in the
 * browser to unwrap the data key.
 *
 * These constants MUST stay in lock-step across the three runtimes that share
 * this module: the Node CLI (encrypt/decrypt), the Astro build (decrypt +
 * re-encrypt), and the browser (final decrypt). Do not change them without
 * re-encrypting existing content.
 */

/** RSA modulus length in bits. 4096 is the conservative upper bound; the only
 *  operation RSA performs here is wrapping a 32-byte data key, so this is well
 *  inside the OAEP plaintext ceiling. */
export const RSA_MODULUS_LENGTH = 4096;

/** RSA public exponent: 65537 (0x10001), as the big-endian bytes Web Crypto wants. */
export const RSA_PUBLIC_EXPONENT = new Uint8Array([1, 0, 1]);

/** Hash used both for RSA-OAEP padding. */
export const RSA_HASH_ALGORITHM = 'SHA-256';

/** AES data-key length in bits. */
export const AES_KEY_LENGTH = 256;

/** AES-GCM initialization-vector length, in bytes (96 bits — the GCM standard). */
export const AES_IV_BYTES = 12;
