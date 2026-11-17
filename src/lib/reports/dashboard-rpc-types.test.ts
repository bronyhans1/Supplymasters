import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPurchaseAggregateShape,
  asDashboardNumber,
  mapDashboardRpc,
} from "./dashboard-rpc-types";

describe("dashboard RPC mapping", () => {
  it("never invents NaN for bad or empty values", () => {
    assert.equal(asDashboardNumber(undefined), 0);
    assert.equal(asDashboardNumber(""), 0);
    assert.equal(asDashboardNumber(Number.NaN), 0);
    assert.equal(asDashboardNumber("12.34"), 12.34);
  });

  it("keeps purchase cost separate from supply and payment totals", () => {
    const mapped = mapDashboardRpc({
      suppliesTodayCount: 1,
      suppliesTodayValue: 50,
      paymentsTodayCount: 1,
      paymentsTodayAmount: 50,
      openDeliveriesCount: 0,
      zeroStockCount: 0,
      purchasesThisMonthCount: 2,
      purchasesThisMonthCost: 80,
      returnsThisMonthCount: 0,
    });
    assert.equal(mapped.purchasesThisMonthCost, 80);
    assert.equal(mapped.suppliesTodayValue + mapped.paymentsTodayAmount, 100);
    assert.notEqual(
      mapped.purchasesThisMonthCost,
      mapped.suppliesTodayValue + mapped.paymentsTodayAmount,
    );
  });

  it("enforces scalar-only purchase aggregate contract", () => {
    assertPurchaseAggregateShape({
      purchaseCount: 0,
      totalPurchaseCost: 0,
    });
    assert.throws(() =>
      assertPurchaseAggregateShape({
        purchaseCount: 1,
        totalPurchaseCost: 2,
        supplier_id: "uuid",
      }),
    );
  });
});
