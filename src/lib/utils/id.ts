/**
 * Browser-safe UUID v4 generator.
 *
 * `crypto.randomUUID()` is missing in some non-secure contexts (e.g. iPhone
 * accessing the Next.js dev server over LAN HTTP). Prefer it when present,
 * then `crypto.getRandomValues()`, then a collision-resistant last resort
 * that still returns UUID-shaped strings for Postgres `uuid` columns /
 * idempotency keys.
 */
export function createUuid(): string {
  const webCrypto = getWebCrypto();
  if (webCrypto?.randomUUID) {
    try {
      return webCrypto.randomUUID();
    } catch {
      // Secure-context / implementation edge cases — fall through.
    }
  }

  if (webCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    return bytesToUuidV4(bytes);
  }

  return fallbackUuidV4();
}

function getWebCrypto(): Crypto | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const candidate = (globalThis as { crypto?: Crypto }).crypto;
  return candidate;
}

function bytesToUuidV4(bytes: Uint8Array): string {
  // RFC 4122 version 4 + variant 1
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Last-resort UUID-shaped id for non-secret idempotency keys only.
 * Combines time, a counter, and Math.random entropy — not for cryptography.
 */
let fallbackCounter = 0;

function fallbackUuidV4(): string {
  fallbackCounter = (fallbackCounter + 1) >>> 0;
  const bytes = new Uint8Array(16);
  const time = Date.now();
  const rand = Math.random() * 0x100000000;

  bytes[0] = (time >>> 24) & 0xff;
  bytes[1] = (time >>> 16) & 0xff;
  bytes[2] = (time >>> 8) & 0xff;
  bytes[3] = time & 0xff;
  bytes[4] = (fallbackCounter >>> 8) & 0xff;
  bytes[5] = fallbackCounter & 0xff;
  bytes[6] = (Math.floor(rand) >>> 24) & 0xff;
  bytes[7] = (Math.floor(rand) >>> 16) & 0xff;
  bytes[8] = (Math.floor(rand) >>> 8) & 0xff;
  bytes[9] = Math.floor(rand) & 0xff;
  for (let i = 10; i < 16; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToUuidV4(bytes);
}
