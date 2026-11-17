import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  listReturnsQuerySchema,
  recordDeliveryStockReturnSchema,
} from "@/lib/returns/schemas";

describe("listReturnsQuerySchema", () => {
  it("defaults and paginates safely", () => {
    const parsed = listReturnsQuerySchema.parse({});
    assert.equal(parsed.q, "");
    assert.equal(parsed.page, 1);
    assert.equal(parsed.vendorId, "");
  });

  it("rejects invalid dates and zero pages", () => {
    assert.equal(
      listReturnsQuerySchema.safeParse({ fromDate: "01/01/2026" }).success,
      false,
    );
    assert.equal(listReturnsQuerySchema.safeParse({ page: "0" }).success, false);
  });
});

describe("recordDeliveryStockReturnSchema", () => {
  const deliveryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const productId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  const clientRequestId = "99999999-aaaa-4bbb-8ccc-dddddddddddd";

  it("accepts a valid return payload", () => {
    const parsed = recordDeliveryStockReturnSchema.parse({
      clientRequestId,
      deliveryId,
      notes: " Damaged packaging ",
      items: [{ productId, quantity: "2" }],
    });
    assert.equal(parsed.clientRequestId, clientRequestId);
    assert.equal(parsed.deliveryId, deliveryId);
    assert.equal(parsed.notes, "Damaged packaging");
    assert.equal(parsed.items[0]?.quantity, 2);
  });

  it("requires a client request id", () => {
    assert.equal(
      recordDeliveryStockReturnSchema.safeParse({
        deliveryId,
        items: [{ productId, quantity: 1 }],
      }).success,
      false,
    );
  });

  it("rejects empty returns, non-positive quantities, and duplicate products", () => {
    assert.equal(
      recordDeliveryStockReturnSchema.safeParse({
        clientRequestId,
        deliveryId,
        items: [],
      }).success,
      false,
    );
    assert.equal(
      recordDeliveryStockReturnSchema.safeParse({
        clientRequestId,
        deliveryId,
        items: [{ productId, quantity: 0 }],
      }).success,
      false,
    );
    assert.equal(
      recordDeliveryStockReturnSchema.safeParse({
        clientRequestId,
        deliveryId,
        items: [{ productId, quantity: 1.5 }],
      }).success,
      false,
    );
    assert.equal(
      recordDeliveryStockReturnSchema.safeParse({
        clientRequestId,
        deliveryId,
        items: [
          { productId, quantity: 1 },
          { productId, quantity: 2 },
        ],
      }).success,
      false,
    );
  });

  it("treats blank notes as null", () => {
    const parsed = recordDeliveryStockReturnSchema.parse({
      clientRequestId,
      deliveryId,
      notes: "   ",
      items: [{ productId, quantity: 1 }],
    });
    assert.equal(parsed.notes, null);
  });
});
