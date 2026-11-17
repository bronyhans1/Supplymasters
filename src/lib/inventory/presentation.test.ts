import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatSignedQuantity,
  stockMovementLabel,
  stockMovementReferenceLabel,
} from "@/lib/inventory/presentation";

describe("inventory presentation", () => {
  it("labels known movement types without inventing unknown ones", () => {
    assert.equal(stockMovementLabel("PURCHASE"), "Purchase receipt");
    assert.equal(stockMovementLabel("SUPPLY_DISPATCH"), "Supply dispatch");
    assert.equal(stockMovementLabel("DELIVERY_RETURN"), "Delivery return");
    assert.equal(stockMovementLabel("ADJUSTMENT"), "Stock adjustment");
    assert.equal(stockMovementLabel("CORRECTION"), "Stock correction");
  });

  it("formats signed quantities and known references", () => {
    assert.equal(formatSignedQuantity(5), "+5");
    assert.equal(formatSignedQuantity(-3), "-3");
    assert.equal(
      stockMovementReferenceLabel("inventory_adjustment", null),
      "Manual adjustment",
    );
    assert.equal(stockMovementReferenceLabel(null, null), "—");
  });
});
