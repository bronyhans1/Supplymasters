import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessPayments,
  roleCanAccessPayments,
} from "@/lib/payments/authorization";
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

describe("payments authorization", () => {
  it("allows active admin and staff", () => {
    assert.equal(canAccessPayments(profile({ role: "ADMIN" })), true);
    assert.equal(canAccessPayments(profile({ role: "STAFF" })), true);
    assert.equal(roleCanAccessPayments("ADMIN"), true);
    assert.equal(roleCanAccessPayments("STAFF"), true);
  });

  it("rejects unauthenticated, inactive, password-change, and DRIVER accounts", () => {
    assert.equal(canAccessPayments(null), false);
    assert.equal(canAccessPayments(undefined), false);
    assert.equal(canAccessPayments(profile({ role: "DRIVER" })), false);
    assert.equal(roleCanAccessPayments("DRIVER"), false);
    assert.equal(canAccessPayments(profile({ is_active: false })), false);
    assert.equal(
      canAccessPayments(profile({ must_change_password: true })),
      false,
    );
  });
});
