import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adjustInventorySchema,
  listInventoryQuerySchema,
} from "@/lib/inventory/schemas";

describe("listInventoryQuerySchema", () => {
  it("defaults search, category, stock, and page", () => {
    const parsed = listInventoryQuerySchema.parse({});
    assert.equal(parsed.q, "");
    assert.equal(parsed.category, "");
    assert.equal(parsed.stock, "ALL");
    assert.equal(parsed.page, 1);
  });

  it("accepts stock filters used by the inventory table", () => {
    assert.equal(
      listInventoryQuerySchema.parse({ stock: "ZERO" }).stock,
      "ZERO",
    );
    assert.equal(
      listInventoryQuerySchema.parse({ stock: "IN_STOCK" }).stock,
      "IN_STOCK",
    );
  });
});

describe("adjustInventorySchema", () => {
  const productId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const clientRequestId = "11111111-2222-4333-8444-555555555555";

  it("maps increase and decrease into a signed quantity delta with request id", () => {
    const increase = adjustInventorySchema.parse({
      clientRequestId,
      productId,
      direction: "increase",
      quantity: 4,
      reason: "Count correction",
    });
    assert.equal(increase.quantityDelta, 4);
    assert.equal(increase.clientRequestId, clientRequestId);

    const decrease = adjustInventorySchema.parse({
      clientRequestId,
      productId,
      direction: "decrease",
      quantity: 2,
      reason: "Damaged stock write-off",
    });
    assert.equal(decrease.quantityDelta, -2);
  });

  it("rejects missing request id, zero quantity, or blank reasons", () => {
    assert.equal(
      adjustInventorySchema.safeParse({
        productId,
        direction: "increase",
        quantity: 1,
        reason: "Valid reason",
      }).success,
      false,
    );
    assert.equal(
      adjustInventorySchema.safeParse({
        clientRequestId,
        productId,
        direction: "increase",
        quantity: 0,
        reason: "Valid reason",
      }).success,
      false,
    );
    assert.equal(
      adjustInventorySchema.safeParse({
        clientRequestId,
        productId,
        direction: "increase",
        quantity: 1,
        reason: "ab",
      }).success,
      false,
    );
  });
});
