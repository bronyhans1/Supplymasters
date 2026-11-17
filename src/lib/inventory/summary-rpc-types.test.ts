import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  asInventorySummaryNumber,
  mapInventorySummaryRpc,
} from "./summary-rpc-types";

describe("asInventorySummaryNumber", () => {
  it("maps empty and invalid values to zero without NaN", () => {
    assert.equal(asInventorySummaryNumber(null), 0);
    assert.equal(asInventorySummaryNumber(undefined), 0);
    assert.equal(asInventorySummaryNumber(""), 0);
    assert.equal(asInventorySummaryNumber("bad"), 0);
    assert.equal(asInventorySummaryNumber(Number.NaN), 0);
  });

  it("preserves finite numeric precision from strings", () => {
    assert.equal(asInventorySummaryNumber("12.5"), 12.5);
    assert.equal(asInventorySummaryNumber(3), 3);
  });
});

describe("mapInventorySummaryRpc", () => {
  it("maps empty inventory payload to zeros and empty UoM totals", () => {
    const mapped = mapInventorySummaryRpc({
      productCount: 0,
      inventoryRecordCount: "0",
      productsWithStock: 0,
      productsWithZeroStock: 0,
      productsMissingInventory: 0,
      totalsByUnit: [],
    });
    assert.equal(mapped.productCount, 0);
    assert.equal(mapped.inventoryRecordCount, 0);
    assert.equal(mapped.productsWithStock, 0);
    assert.equal(mapped.productsWithZeroStock, 0);
    assert.equal(mapped.productsMissingInventory, 0);
    assert.deepEqual(mapped.totalsByUnit, []);
  });

  it("maps multiple products and UoM groups without inventing money fields", () => {
    const mapped = mapInventorySummaryRpc({
      productCount: 5,
      inventoryRecordCount: 4,
      productsWithStock: 2,
      productsWithZeroStock: 2,
      productsMissingInventory: 1,
      totalsByUnit: [
        { unit_of_measure: "carton", quantity_on_hand: "10", product_count: "2" },
        { unit_of_measure: "kg", quantity_on_hand: 3.5, product_count: 2 },
      ],
    });
    assert.equal(mapped.productCount, 5);
    assert.equal(mapped.productsMissingInventory, 1);
    assert.equal(mapped.totalsByUnit.length, 2);
    assert.equal(mapped.totalsByUnit[0]?.quantity_on_hand, 10);
    assert.equal(mapped.totalsByUnit[1]?.quantity_on_hand, 3.5);
    assert.equal(
      Object.prototype.hasOwnProperty.call(mapped, "zeroStockCount"),
      false,
    );
  });

  it("treats blank unit labels as Unspecified", () => {
    const mapped = mapInventorySummaryRpc({
      productCount: 1,
      inventoryRecordCount: 1,
      productsWithStock: 1,
      productsWithZeroStock: 0,
      productsMissingInventory: 0,
      totalsByUnit: [
        { unit_of_measure: "  ", quantity_on_hand: 1, product_count: 1 },
      ],
    });
    assert.equal(mapped.totalsByUnit[0]?.unit_of_measure, "Unspecified");
  });

  it("handles null totalsByUnit as empty", () => {
    const mapped = mapInventorySummaryRpc({
      productCount: 0,
      inventoryRecordCount: 0,
      productsWithStock: 0,
      productsWithZeroStock: 0,
      productsMissingInventory: 0,
      totalsByUnit: null,
    });
    assert.deepEqual(mapped.totalsByUnit, []);
  });
});
