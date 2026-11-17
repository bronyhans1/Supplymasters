import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { partitionAuditMetadata, sanitizeAuditMetadata } from "./sanitize";

describe("sanitizeAuditMetadata", () => {
  it("keeps allowlisted fields and drops denied keys", () => {
    const cleaned = sanitizeAuditMetadata({
      code: "NM-PRD-000003",
      name: "D1P2 Product",
      is_active: true,
      phone: "+233000000000",
      alt_phone: "+233111111111",
      notes: "secret note",
      password: "nope",
      token: "abc",
      unknown_field: "drop me",
      contact_person: "should-drop",
      after: {
        brand: "D1P2",
        phone: "should-drop",
        contact_person: "should-drop",
        is_active: true,
      },
      changed_fields: ["name", "phone"],
      quantity_after: 11,
      item_count: 1,
      total_cost: 120,
    });

    assert.deepEqual(cleaned, {
      code: "NM-PRD-000003",
      name: "D1P2 Product",
      is_active: true,
      after: {
        brand: "D1P2",
        is_active: true,
      },
      changed_fields: ["name", "phone"],
      quantity_after: 11,
      item_count: 1,
      total_cost: 120,
    });
    assert.equal("phone" in cleaned, false);
    assert.equal("notes" in cleaned, false);
    assert.equal("contact_person" in cleaned, false);
  });

  it("does not invent values for omitted sensitive fields", () => {
    const cleaned = sanitizeAuditMetadata({
      code: "NM-VND-1",
      changed_fields: ["phone", "notes"],
    });
    assert.deepEqual(cleaned, {
      code: "NM-VND-1",
      changed_fields: ["phone", "notes"],
    });
    assert.equal(Object.hasOwn(cleaned, "phone"), false);
    assert.equal(Object.hasOwn(cleaned, "notes"), false);
  });

  it("returns empty object for non-object metadata", () => {
    assert.deepEqual(sanitizeAuditMetadata(null), {});
    assert.deepEqual(sanitizeAuditMetadata("x" as never), {});
    assert.deepEqual(sanitizeAuditMetadata(["a"] as never), {});
  });

  it("allowlists supply/payment totals and still denies sensitive fields", () => {
    const cleaned = sanitizeAuditMetadata({
      grand_total: 450.5,
      amount: 100,
      payment_method: "CASH",
      item_count: 2,
      password: "nope",
      token: "abc",
      email: "secret@example.com",
      phone: "+233000000000",
      notes: "secret note",
      credentials: "nope",
    });

    assert.deepEqual(cleaned, {
      grand_total: 450.5,
      amount: 100,
      payment_method: "CASH",
      item_count: 2,
    });
    assert.equal(Object.hasOwn(cleaned, "password"), false);
    assert.equal(Object.hasOwn(cleaned, "token"), false);
    assert.equal(Object.hasOwn(cleaned, "email"), false);
    assert.equal(Object.hasOwn(cleaned, "phone"), false);
    assert.equal(Object.hasOwn(cleaned, "notes"), false);
    assert.equal(Object.hasOwn(cleaned, "credentials"), false);
  });

  it("keeps Phase C assignment snapshots and still drops email/secrets", () => {
    const cleaned = sanitizeAuditMetadata({
      change_kind: "DRIVER_CHANGED",
      delivery_ref: "NM-DEL-000001",
      actor_name: "Ama Mensah",
      previous_driver_name: "Kojo",
      previous_driver_code: "NM-DRV-1",
      new_driver_name: "Ama",
      new_driver_code: "NM-DRV-2",
      previous_driver_id: "11111111-1111-4111-8111-111111111111",
      email: "secret@example.com",
      token: "nope",
      password: "nope",
    });

    assert.equal(cleaned.change_kind, "DRIVER_CHANGED");
    assert.equal(cleaned.delivery_ref, "NM-DEL-000001");
    assert.equal(cleaned.actor_name, "Ama Mensah");
    assert.equal(cleaned.previous_driver_name, "Kojo");
    assert.equal(cleaned.new_driver_code, "NM-DRV-2");
    assert.equal(
      cleaned.previous_driver_id,
      "11111111-1111-4111-8111-111111111111",
    );
    assert.equal(Object.hasOwn(cleaned, "email"), false);
    assert.equal(Object.hasOwn(cleaned, "token"), false);
    assert.equal(Object.hasOwn(cleaned, "password"), false);
  });
});

describe("partitionAuditMetadata", () => {
  it("keeps human fields visible and parks uuid keys as technical", () => {
    const { human, technical } = partitionAuditMetadata({
      movement_type: "PURCHASE",
      quantity_delta: 2,
      product_id: "11111111-1111-4111-8111-111111111111",
      client_request_id: "22222222-2222-4222-8222-222222222222",
    });
    assert.deepEqual(human, {
      movement_type: "PURCHASE",
      quantity_delta: 2,
    });
    assert.deepEqual(technical, {
      product_id: "11111111-1111-4111-8111-111111111111",
      client_request_id: "22222222-2222-4222-8222-222222222222",
    });
  });
});
