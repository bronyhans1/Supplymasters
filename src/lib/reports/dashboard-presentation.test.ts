import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDashboardMetricCards,
  type DashboardMetricSource,
} from "./dashboard-presentation";

const sample: DashboardMetricSource = {
  suppliesTodayCount: 0,
  suppliesTodayValue: 0,
  paymentsTodayAmount: 0,
  paymentsTodayCount: 0,
  openDeliveriesCount: 2,
  zeroStockCount: 1,
  purchasesThisMonthCount: 7,
  purchasesThisMonthCost: 4590,
  returnsThisMonthCount: 0,
};

describe("buildDashboardMetricCards", () => {
  it("shows money as the primary value and count as secondary text", () => {
    const cards = buildDashboardMetricCards(sample);
    const purchases = cards.find((card) => card.label === "Purchases this month");
    const payments = cards.find((card) => card.label === "Payments collected today");
    const supplies = cards.find((card) => card.label === "Supplies today");

    assert.ok(purchases);
    assert.equal(purchases.primary, "GH₵4,590.00");
    assert.equal(purchases.secondary, "7 stock purchases recorded this month");
    assert.doesNotMatch(purchases.primary, /·/);
    assert.doesNotMatch(purchases.secondary, /·/);

    assert.ok(payments);
    assert.equal(payments.primary, "GH₵0.00");
    assert.equal(payments.secondary, "0 payments recorded today");

    assert.ok(supplies);
    assert.equal(supplies.primary, "GH₵0.00");
    assert.equal(supplies.secondary, "0 supplies recorded today");
  });

  it("preserves open-delivery drill-down to OPEN status", () => {
    const open = buildDashboardMetricCards(sample).find(
      (card) => card.label === "Open deliveries",
    );
    assert.equal(open?.href, "/app/deliveries?status=OPEN");
    assert.equal(open?.primary, "2");
  });

  it("keeps ADMIN report hrefs and STAFF operational hrefs without changing metrics", () => {
    const admin = buildDashboardMetricCards(sample, "ADMIN");
    const staff = buildDashboardMetricCards(sample, "STAFF");

    assert.equal(
      admin.find((c) => c.label === "Supplies today")?.href,
      "/app/reports?period=today&section=supplies",
    );
    assert.equal(
      staff.find((c) => c.label === "Supplies today")?.href,
      "/app/supplies",
    );
    assert.equal(
      staff.find((c) => c.label === "Purchases this month")?.href,
      undefined,
    );
    assert.equal(
      admin.find((c) => c.label === "Purchases this month")?.primary,
      staff.find((c) => c.label === "Purchases this month")?.primary,
    );
  });
});
