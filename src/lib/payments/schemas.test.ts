import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listPaymentsQuerySchema, PAYMENT_METHODS } from "@/lib/payments/schemas";

describe("listPaymentsQuerySchema", () => {
  it("applies defaults for empty query", () => {
    const parsed = listPaymentsQuerySchema.parse({});
    assert.equal(parsed.q, "");
    assert.equal(parsed.paymentMethod, "");
    assert.equal(parsed.fromDate, "");
    assert.equal(parsed.toDate, "");
    assert.equal(parsed.vendorId, "");
    assert.equal(parsed.page, 1);
  });

  it("accepts known payment methods and date filters", () => {
    for (const method of PAYMENT_METHODS) {
      const parsed = listPaymentsQuerySchema.parse({
        paymentMethod: method,
        fromDate: "2026-01-01",
        toDate: "2026-01-31",
        page: "2",
      });
      assert.equal(parsed.paymentMethod, method);
      assert.equal(parsed.page, 2);
    }
  });

  it("rejects invalid dates and unknown payment methods", () => {
    assert.equal(
      listPaymentsQuerySchema.safeParse({ fromDate: "01-01-2026" }).success,
      false,
    );
    assert.equal(
      listPaymentsQuerySchema.safeParse({ paymentMethod: "CRYPTO" }).success,
      false,
    );
    assert.equal(
      listPaymentsQuerySchema.safeParse({ page: "0" }).success,
      false,
    );
  });

  it("trims search and vendor filters", () => {
    const parsed = listPaymentsQuerySchema.parse({
      q: "  NM-PAY-000001  ",
      vendorId: "  vendor-1  ",
    });
    assert.equal(parsed.q, "NM-PAY-000001");
    assert.equal(parsed.vendorId, "vendor-1");
  });
});
