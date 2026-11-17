import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatReturnDateTime,
  formatReturnDisplayId,
  isReturnBusinessRef,
  returnEligibilityMessage,
} from "@/lib/returns/presentation";

describe("returns presentation", () => {
  it("prefers NM/SM-RET business references and does not invent RET-UUID codes", () => {
    assert.equal(formatReturnDisplayId("NM-RET-000042"), "NM-RET-000042");
    assert.equal(formatReturnDisplayId("SM-RET-000007"), "SM-RET-000007");
    assert.equal(isReturnBusinessRef("NM-RET-000042"), true);
    assert.equal(isReturnBusinessRef("SM-RET-000007"), true);
    assert.equal(isReturnBusinessRef("RET-AAAAAAAA"), false);
    assert.equal(
      formatReturnDisplayId(null, "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"),
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    );
    assert.doesNotMatch(
      formatReturnDisplayId("SM-RET-000001"),
      /^RET-[A-F0-9]{8}$/,
    );
  });

  it("formats missing timestamps safely", () => {
    assert.equal(formatReturnDateTime(null), "—");
    assert.equal(formatReturnDateTime(undefined), "—");
  });

  it("explains eligibility by delivery status", () => {
    assert.match(returnEligibilityMessage("FAILED"), /can accept/i);
    assert.match(returnEligibilityMessage("PENDING"), /FAILED or CANCELLED/i);
  });
});
