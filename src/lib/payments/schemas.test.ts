import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listPaymentsQuerySchema,
  PAYMENT_METHODS,
  recordFullPaymentSchema,
} from "@/lib/payments/schemas";

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

describe("recordFullPaymentSchema", () => {
  const supplyId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

  it("accepts a full payment payload", () => {
    const parsed = recordFullPaymentSchema.parse({
      supplyId,
      paymentMethod: "CASH",
      paymentDate: "2026-11-19",
      transactionReference: "RCPT-9",
      notes: "Collected",
    });
    assert.equal(parsed.supplyId, supplyId);
    assert.equal(parsed.paymentMethod, "CASH");
    assert.equal(parsed.transactionReference, "RCPT-9");
  });

  it("rejects invalid supply id and unknown methods", () => {
    assert.equal(
      recordFullPaymentSchema.safeParse({
        supplyId: "not-a-uuid",
        paymentMethod: "CASH",
      }).success,
      false,
    );
    assert.equal(
      recordFullPaymentSchema.safeParse({
        supplyId,
        paymentMethod: "CRYPTO",
      }).success,
      false,
    );
  });
});
