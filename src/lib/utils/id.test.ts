import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createUuid } from "@/lib/utils/id";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("createUuid", () => {
  it("returns a UUID v4-shaped string", () => {
    const id = createUuid();
    assert.match(id, UUID_V4_RE);
  });

  it("returns distinct ids across calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => createUuid()));
    assert.equal(ids.size, 50);
  });

  it("falls back when randomUUID is unavailable (LAN HTTP / insecure context)", () => {
    const original = globalThis.crypto;
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i += 1) bytes[i] = i + 1;

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues(target: Uint8Array) {
          target.set(bytes.subarray(0, target.length));
          return target;
        },
      },
    });

    try {
      assert.equal(typeof (globalThis.crypto as Crypto).randomUUID, "undefined");
      const id = createUuid();
      assert.match(id, UUID_V4_RE);
      // Version nibble forced to 4
      assert.equal(id[14], "4");
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: original,
      });
    }
  });

  it("uses a last-resort path when Web Crypto is missing entirely", () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined,
    });

    try {
      const id = createUuid();
      assert.match(id, UUID_V4_RE);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: original,
      });
    }
  });
});
