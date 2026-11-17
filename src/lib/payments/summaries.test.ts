import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregatePaymentAmounts } from "@/lib/payments/summaries";

describe("aggregatePaymentAmounts", () => {
  it("counts payments and sums amounts without float drift", () => {
    const result = aggregatePaymentAmounts([
      { amount: 10.1, payment_method: "CASH" },
      { amount: 20.2, payment_method: "CASH" },
      { amount: 0.3, payment_method: "MOBILE_MONEY" },
    ]);

    assert.equal(result.count, 3);
    assert.equal(result.totalAmount, 30.6);
    assert.deepEqual(result.byMethod, [
      { method: "CASH", count: 2, amount: 30.3 },
      { method: "MOBILE_MONEY", count: 1, amount: 0.3 },
    ]);
  });

  it("returns empty aggregates for no rows", () => {
    const result = aggregatePaymentAmounts([]);
    assert.equal(result.count, 0);
    assert.equal(result.totalAmount, 0);
    assert.deepEqual(result.byMethod, []);
  });

  it("does not invent methods that have zero payments", () => {
    const result = aggregatePaymentAmounts([
      { amount: 100, payment_method: "BANK_TRANSFER" },
    ]);
    assert.equal(result.byMethod.length, 1);
    assert.equal(result.byMethod[0]?.method, "BANK_TRANSFER");
  });
});
