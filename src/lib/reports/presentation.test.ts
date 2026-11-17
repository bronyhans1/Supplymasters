import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  endOfGhanaMonth,
  resolveReportPeriod,
  shiftGhanaDate,
  startOfGhanaMonth,
} from "./presentation";

describe("report period resolution", () => {
  it("resolves today and yesterday on the Ghana calendar", () => {
    const now = new Date("2026-03-15T12:00:00Z");
    const today = resolveReportPeriod("today", "", "", now);
    assert.equal(today.fromDate, "2026-03-15");
    assert.equal(today.toDate, "2026-03-15");

    const yesterday = resolveReportPeriod("yesterday", "", "", now);
    assert.equal(yesterday.fromDate, "2026-03-14");
    assert.equal(yesterday.toDate, "2026-03-14");
  });

  it("resolves rolling and month windows", () => {
    const now = new Date("2026-03-15T12:00:00Z");
    const last7 = resolveReportPeriod("last_7_days", "", "", now);
    assert.equal(last7.fromDate, "2026-03-09");
    assert.equal(last7.toDate, "2026-03-15");

    const thisMonth = resolveReportPeriod("this_month", "", "", now);
    assert.equal(thisMonth.fromDate, "2026-03-01");
    assert.equal(thisMonth.toDate, "2026-03-15");

    const lastMonth = resolveReportPeriod("last_month", "", "", now);
    assert.equal(lastMonth.fromDate, "2026-02-01");
    assert.equal(lastMonth.toDate, "2026-02-28");
  });

  it("orders custom ranges and supports month helpers", () => {
    const custom = resolveReportPeriod("custom", "2026-04-10", "2026-04-01");
    assert.equal(custom.fromDate, "2026-04-01");
    assert.equal(custom.toDate, "2026-04-10");
    assert.equal(startOfGhanaMonth("2026-04-18"), "2026-04-01");
    assert.equal(endOfGhanaMonth("2026-04-18"), "2026-04-30");
    assert.equal(shiftGhanaDate("2026-04-01", -1), "2026-03-31");
  });
});
