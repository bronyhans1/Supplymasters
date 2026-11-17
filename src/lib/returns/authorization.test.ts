import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessReturns,
  canRecordReturnForDeliveryStatus,
  roleCanAccessReturns,
} from "@/lib/returns/authorization";
import type { Profile } from "@/types/profile";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "11111111-1111-4111-8111-111111111111",
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

describe("returns authorization", () => {
  it("allows active admin and staff", () => {
    assert.equal(canAccessReturns(profile({ role: "ADMIN" })), true);
    assert.equal(canAccessReturns(profile({ role: "STAFF" })), true);
    assert.equal(roleCanAccessReturns("ADMIN"), true);
    assert.equal(roleCanAccessReturns("STAFF"), true);
  });

  it("rejects unauthenticated, inactive, password-change, and DRIVER accounts", () => {
    assert.equal(canAccessReturns(null), false);
    assert.equal(canAccessReturns(undefined), false);
    assert.equal(canAccessReturns(profile({ role: "DRIVER" })), false);
    assert.equal(roleCanAccessReturns("DRIVER"), false);
    assert.equal(canAccessReturns(profile({ is_active: false })), false);
    assert.equal(
      canAccessReturns(profile({ must_change_password: true })),
      false,
    );
  });

  it("allows stock returns only for FAILED or CANCELLED deliveries", () => {
    assert.equal(canRecordReturnForDeliveryStatus("FAILED"), true);
    assert.equal(canRecordReturnForDeliveryStatus("CANCELLED"), true);
    assert.equal(canRecordReturnForDeliveryStatus("PENDING"), false);
    assert.equal(canRecordReturnForDeliveryStatus("DISPATCHED"), false);
    assert.equal(canRecordReturnForDeliveryStatus("DELIVERED"), false);
  });
});
