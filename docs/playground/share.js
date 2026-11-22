/**
 * Share links: the Playground's code travels in the URL hash, gzip-compressed
 * with the browser's CompressionStream and encoded as base64url:
 *
 *   playground/#code=gz.<base64url>
 *
 * Without CompressionStream the code is stored uncompressed as
 * `#code=b64.<base64url>`; both forms decode everywhere DecompressionStream
 * exists, and the uncompressed form decodes everywhere.
 */

function toBase64URL(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64URL(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pipe(bytes, stream) {
  const response = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Encode source code for the URL hash.
 * @param {string} code
 * @returns {Promise<string>} e.g. "gz.H4sIAAAA…"
 */
export async function encodeCode(code) {
  const bytes = new TextEncoder().encode(code);
  if (typeof CompressionStream === 'function') {
    return 'gz.' + toBase64URL(await pipe(bytes, new CompressionStream('gzip')));
  }
  return 'b64.' + toBase64URL(bytes);
}

/**
 * Decode a value made by encodeCode.
 * @param {string} value
 * @returns {Promise<string>}
 */
export async function decodeCode(value) {
  const dot = value.indexOf('.');
  const format = value.slice(0, dot);
  const bytes = fromBase64URL(value.slice(dot + 1));
  if (format === 'gz') {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('This browser cannot decompress the shared code (no DecompressionStream).');
    }
    return new TextDecoder().decode(await pipe(bytes, new DecompressionStream('gzip')));
  }
  if (format === 'b64') return new TextDecoder().decode(bytes);
  throw new Error(`Unknown share format "${format}".`);
}

/**
 * Read `code` or `example` from a location hash ("#code=…&example=…").
 * @param {string} hash
 * @returns {{ code: string|null, example: string|null }}
 */
export function parseHash(hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return { code: params.get('code'), example: params.get('example') };
}
