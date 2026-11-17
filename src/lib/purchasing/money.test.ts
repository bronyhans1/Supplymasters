import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatGhs,
  lineTotal,
  parseMoneyInput,
  roundMoney,
  sumLineTotals,
} from "@/lib/purchasing/money";

describe("purchase money helpers", () => {
  it("rounds and formats GH₵ amounts", () => {
    assert.equal(roundMoney(12.345), 12.35);
    assert.match(formatGhs(1250.5), /GH₵/);
    assert.match(formatGhs(1250.5), /1,250\.50|1250\.50/);
  });

  it("calculates line and purchase totals without float drift", () => {
    assert.equal(lineTotal(3, 10.1), 30.3);
    assert.equal(
      sumLineTotals([
        { quantity: 2, unitCost: 0.1 },
        { quantity: 1, unitCost: 0.2 },
      ]),
      0.4,
    );
  });

  it("parses money input strictly", () => {
    assert.equal(parseMoneyInput("12.50"), 12.5);
    assert.equal(parseMoneyInput("12.5"), 12.5);
    assert.equal(parseMoneyInput("12.505"), null);
    assert.equal(parseMoneyInput("-1"), null);
    assert.equal(parseMoneyInput("abc"), null);
  });
});
