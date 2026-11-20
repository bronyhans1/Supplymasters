import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSupplySchema, listSuppliesQuerySchema } from "@/lib/supplies/schemas";
import { lineTotal, sumLineTotals } from "@/lib/supplies/money";
import { mapSupplyCreateError } from "@/lib/supplies/db-errors";

const vendorId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const productA = "11111111-2222-4333-8444-555555555555";
const productB = "66666666-7777-4888-8999-aaaaaaaaaaaa";
const clientRequestId = "99999999-aaaa-4bbb-8ccc-dddddddddddd";

describe("createSupplySchema", () => {
  it("accepts a valid unpaid supply and computes totals server-side", () => {
    const result = createSupplySchema.safeParse({
      clientRequestId,
      vendorId,
      supplyDate: "2026-11-08",
      notes: "",
      items: [
        { productId: productA, quantity: 2, unitPrice: "12.50" },
        { productId: productB, quantity: 1, unitPrice: "5.00" },
      ],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.computedTotal, sumLineTotals([
        { quantity: 2, unitCost: 12.5 },
        { quantity: 1, unitCost: 5 },
      ]));
      assert.equal(result.data.totalQuantity, 3);
      assert.equal(result.data.items[0]?.lineTotal, lineTotal(2, 12.5));
      assert.equal("paymentMethod" in result.data, false);
    }
  });

  it("requires request id, positive quantities, and unique products", () => {
    assert.equal(
      createSupplySchema.safeParse({
        vendorId,
        supplyDate: "2026-11-08",
        items: [{ productId: productA, quantity: 1, unitPrice: "1.00" }],
      }).success,
      false,
    );

    assert.equal(
      createSupplySchema.safeParse({
        clientRequestId,
        vendorId,
        supplyDate: "2026-11-08",
        items: [{ productId: productA, quantity: 0, unitPrice: "1.00" }],
      }).success,
      false,
    );

    assert.equal(
      createSupplySchema.safeParse({
        clientRequestId,
        vendorId,
        supplyDate: "2026-11-08",
        items: [
          { productId: productA, quantity: 1, unitPrice: "1.00" },
          { productId: productA, quantity: 2, unitPrice: "2.00" },
        ],
      }).success,
      false,
    );
  });

  it("rejects zero total supplies", () => {
    const result = createSupplySchema.safeParse({
      clientRequestId,
      vendorId,
      supplyDate: "2026-11-08",
      items: [{ productId: productA, quantity: 1, unitPrice: "0.00" }],
    });
    assert.equal(result.success, false);
  });

  it("ignores legacy payment fields during supply create", () => {
    const result = createSupplySchema.safeParse({
      clientRequestId,
      vendorId,
      supplyDate: "2026-11-08",
      paymentMethod: "CASH",
      transactionReference: "RCPT-1",
      items: [{ productId: productA, quantity: 1, unitPrice: "10.00" }],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal("paymentMethod" in result.data, false);
      assert.equal("transactionReference" in result.data, false);
    }
  });
});

describe("listSuppliesQuerySchema", () => {
  it("defaults list filters", () => {
    const parsed = listSuppliesQuerySchema.parse({});
    assert.equal(parsed.q, "");
    assert.equal(parsed.page, 1);
  });
});

describe("mapSupplyCreateError", () => {
  it("maps insufficient stock and authorization failures", () => {
    assert.equal(
      mapSupplyCreateError({ message: "Insufficient stock for product x" }).code,
      "INSUFFICIENT_STOCK",
    );
    assert.equal(
      mapSupplyCreateError({
        message: "Only staff or administrators may create supply transactions.",
      }).code,
      "FORBIDDEN",
    );
  });
});
