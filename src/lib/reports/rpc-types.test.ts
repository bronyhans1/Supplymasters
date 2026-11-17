import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asNumber, asNumberOrNull } from "./rpc-types";

describe("reports RPC numeric coercion", () => {
  it("parses numeric strings without inventing values", () => {
    assert.equal(asNumber("150.50"), 150.5);
    assert.equal(asNumber(0), 0);
    assert.equal(asNumber("0.00"), 0);
    assert.equal(asNumber(null), 0);
    assert.equal(asNumber(undefined), 0);
    assert.equal(asNumber(""), 0);
    assert.equal(asNumber("not-a-number"), 0);
  });

  it("preserves null for optional money fields", () => {
    assert.equal(asNumberOrNull(null), null);
    assert.equal(asNumberOrNull(undefined), null);
    assert.equal(asNumberOrNull(""), null);
    assert.equal(asNumberOrNull("40.25"), 40.25);
    assert.equal(asNumberOrNull("bad"), null);
  });
});
