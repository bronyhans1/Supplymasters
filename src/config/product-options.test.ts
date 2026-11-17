import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCT_PACKAGING_SIZE_OPTIONS,
  PRODUCT_UNIT_OF_MEASURE_OPTIONS,
  isKnownOption,
  resolveSelectableValue,
} from "@/config/product-options";

describe("product selectable options", () => {
  it("includes packaging suggestions and Other", () => {
    assert.ok(PRODUCT_PACKAGING_SIZE_OPTIONS.includes("Carton"));
    assert.ok(PRODUCT_PACKAGING_SIZE_OPTIONS.includes("Other"));
  });

  it("includes unit-of-measure choices", () => {
    assert.deepEqual([...PRODUCT_UNIT_OF_MEASURE_OPTIONS], [
      "Carton",
      "Pack",
      "Piece",
      "Box",
      "Other",
    ]);
  });

  it("resolves known selections without custom text", () => {
    assert.equal(
      resolveSelectableValue("Carton", "ignored", PRODUCT_PACKAGING_SIZE_OPTIONS),
      "Carton",
    );
  });

  it("resolves Other and unknown values from custom text", () => {
    assert.equal(
      resolveSelectableValue(
        "Other",
        "40 × 70 g per carton",
        PRODUCT_PACKAGING_SIZE_OPTIONS,
      ),
      "40 × 70 g per carton",
    );
    assert.equal(isKnownOption(PRODUCT_UNIT_OF_MEASURE_OPTIONS, "Bag"), false);
  });
});
