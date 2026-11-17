import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { receivePurchaseSchema } from "@/lib/purchasing/schemas";
import { mapPurchaseReceiveError } from "@/lib/purchasing/db-errors";
import {
  canAccessPurchasing,
  roleCanAccessPurchasing,
} from "@/lib/purchasing/authorization";
import type { Profile } from "@/types/profile";

const productA = "11111111-1111-4111-8111-111111111111";
const productB = "22222222-2222-4222-8222-222222222222";
const supplierId = "33333333-3333-4333-8333-333333333333";
const clientRequestId = "44444444-4444-4444-8444-444444444444";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    email: "user@example.com",
    full_name: "User",
    phone: null,
    role: "STAFF",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("receivePurchaseSchema", () => {
  it("accepts a valid purchase and computes totals server-side", () => {
    const result = receivePurchaseSchema.safeParse({
      clientRequestId,
      supplierId,
      purchaseDate: "2026-11-07",
      supplierInvoiceRef: "INV-1",
      notes: "",
      items: [
        { productId: productA, quantity: 2, unitCost: "10.50" },
        { productId: productB, quantity: 1, unitCost: 5 },
      ],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.clientRequestId, clientRequestId);
      assert.equal(result.data.computedTotal, 26);
      assert.equal(result.data.items[0]?.lineTotal, 21);
      assert.equal(result.data.supplierInvoiceRef, "INV-1");
      assert.equal(result.data.notes, null);
    }
  });

  it("requires a client request identifier", () => {
    const result = receivePurchaseSchema.safeParse({
      supplierId,
      purchaseDate: "2026-11-07",
      items: [{ productId: productA, quantity: 1, unitCost: "1.00" }],
    });
    assert.equal(result.success, false);
  });

  it("rejects empty purchases, non-positive quantity, and duplicates", () => {
    assert.equal(
      receivePurchaseSchema.safeParse({
        clientRequestId,
        supplierId,
        purchaseDate: "2026-11-07",
        items: [],
      }).success,
      false,
    );

    assert.equal(
      receivePurchaseSchema.safeParse({
        clientRequestId,
        supplierId,
        purchaseDate: "2026-11-07",
        items: [{ productId: productA, quantity: 0, unitCost: "1.00" }],
      }).success,
      false,
    );

    const duplicate = receivePurchaseSchema.safeParse({
      clientRequestId,
      supplierId,
      purchaseDate: "2026-11-07",
      items: [
        { productId: productA, quantity: 1, unitCost: "1.00" },
        { productId: productA, quantity: 2, unitCost: "2.00" },
      ],
    });
    assert.equal(duplicate.success, false);
  });

  it("allows zero unit cost because the database permits it", () => {
    const result = receivePurchaseSchema.safeParse({
      clientRequestId,
      supplierId,
      purchaseDate: "2026-11-07",
      items: [{ productId: productA, quantity: 4, unitCost: "0" }],
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.computedTotal, 0);
    }
  });
});

describe("purchasing authorization", () => {
  it("allows active admin and staff only", () => {
    assert.equal(canAccessPurchasing(profile({ role: "ADMIN" })), true);
    assert.equal(canAccessPurchasing(profile({ role: "STAFF" })), false);
    assert.equal(canAccessPurchasing(profile({ role: "DRIVER" })), false);
    assert.equal(canAccessPurchasing(profile({ is_active: false })), false);
    assert.equal(roleCanAccessPurchasing("DRIVER"), false);
  });
});

describe("purchase receive error mapping", () => {
  it("maps inactive supplier and duplicate product failures safely", () => {
    assert.match(
      mapPurchaseReceiveError({
        message: "Cannot receive purchases from an inactive supplier.",
      }).message,
      /active stock supplier/i,
    );
    assert.match(
      mapPurchaseReceiveError({
        message:
          "duplicate key value violates unique constraint stock_purchase_items_unique_product",
      }).message,
      /only once/i,
    );
    assert.doesNotMatch(
      mapPurchaseReceiveError({ message: "receive_stock_purchase failed" }).message,
      /receive_stock_purchase/,
    );
  });

  it("maps admin-only denial to 403", () => {
    const current = mapPurchaseReceiveError({
      message: "Only administrators may receive stock purchases.",
    });
    assert.equal(current.statusCode, 403);
    assert.equal(current.code, "FORBIDDEN");
    assert.match(current.message, /administrators/i);

    const legacy = mapPurchaseReceiveError({
      message: "Only staff or administrators may receive purchases.",
    });
    assert.equal(legacy.statusCode, 403);
    assert.equal(legacy.code, "FORBIDDEN");
  });

  it("maps fingerprint conflict to 409", () => {
    const conflict = mapPurchaseReceiveError({
      message:
        "This request id was already used for a different stock purchase.",
    });
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.code, "REQUEST_CONFLICT");
    assert.match(conflict.message, /different stock purchase/i);
  });

  it("keeps unknown errors on the generic fallback", () => {
    const fallback = mapPurchaseReceiveError({
      message: "unexpected database failure xyz",
    });
    assert.equal(fallback.statusCode, 400);
    assert.equal(fallback.code, "PURCHASE_RECEIVE_FAILED");
    assert.doesNotMatch(fallback.message, /xyz|database/i);
  });
});
