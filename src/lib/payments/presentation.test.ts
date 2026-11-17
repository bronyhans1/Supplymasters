import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterPaymentMethodOptions,
  formatPaymentDate,
  formatPaymentDateTime,
  ghanaCalendarDate,
  parsePaymentMethodFilter,
  paymentMethodBadgeClass,
  paymentMethodLabel,
} from "@/lib/payments/presentation";
import { formatGhs } from "@/lib/supplies/money";

describe("payments presentation", () => {
  it("labels payment methods from the database enum", () => {
    assert.equal(paymentMethodLabel("CASH"), "Cash");
    assert.equal(paymentMethodLabel("MOBILE_MONEY"), "Mobile money");
    assert.equal(paymentMethodLabel("BANK_TRANSFER"), "Bank transfer");
    assert.equal(paymentMethodLabel("CHEQUE"), "Cheque");
    assert.equal(paymentMethodLabel("OTHER"), "Other");
  });

  it("provides filter options and parses method filters safely", () => {
    const options = filterPaymentMethodOptions();
    assert.equal(options[0]?.value, "");
    assert.ok(options.some((option) => option.value === "CASH"));
    assert.equal(parsePaymentMethodFilter("MOBILE_MONEY"), "MOBILE_MONEY");
    assert.equal(parsePaymentMethodFilter("UNKNOWN"), "");
    assert.ok(paymentMethodBadgeClass("CASH").includes("good"));
  });

  it("formats dates and Ghana cedi amounts", () => {
    assert.equal(formatPaymentDate(null), "—");
    assert.equal(formatPaymentDateTime(undefined), "—");
    assert.match(formatPaymentDate("2026-03-15"), /15/);
    assert.match(formatGhs(1250), /GH₵/);
    assert.match(formatGhs(1250), /1,250\.00|1250\.00/);
  });

  it("returns a YYYY-MM-DD Ghana calendar date", () => {
    const value = ghanaCalendarDate(new Date("2026-06-01T12:00:00Z"));
    assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
  });
});
