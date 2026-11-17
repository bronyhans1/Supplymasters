import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseReportsQuery, reportsQuerySchema } from "./schemas";

describe("reportsQuerySchema", () => {
  it("defaults to this month overview", () => {
    const parsed = reportsQuerySchema.parse({});
    assert.equal(parsed.period, "this_month");
    assert.equal(parsed.section, "overview");
    assert.equal(parsed.page, 1);
  });

  it("requires custom dates when period is custom", () => {
    assert.throws(() =>
      reportsQuerySchema.parse({
        period: "custom",
        fromDate: "",
        toDate: "",
      }),
    );
  });

  it("accepts a valid custom range and filters", () => {
    const parsed = parseReportsQuery({
      period: "custom",
      fromDate: "2026-01-01",
      toDate: "2026-01-31",
      section: "payments",
      paymentMethod: "CASH",
      deliveryStatus: "FAILED",
    });
    assert.equal(parsed.fromDate, "2026-01-01");
    assert.equal(parsed.toDate, "2026-01-31");
    assert.equal(parsed.section, "payments");
    assert.equal(parsed.paymentMethod, "CASH");
    assert.equal(parsed.deliveryStatus, "FAILED");
  });

  it("rejects invalid ISO dates", () => {
    assert.throws(() =>
      reportsQuerySchema.parse({
        period: "custom",
        fromDate: "01-01-2026",
        toDate: "2026-01-31",
      }),
    );
  });
});
