import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessDeliveries,
  canManageDeliveryAssignments,
  roleCanAccessDeliveries,
  roleCanManageDeliveryAssignments,
} from "@/lib/deliveries/authorization";
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

describe("deliveries authorization", () => {
  it("allows active admin and staff", () => {
    assert.equal(canAccessDeliveries(profile({ role: "ADMIN" })), true);
    assert.equal(canAccessDeliveries(profile({ role: "STAFF" })), true);
    assert.equal(roleCanAccessDeliveries("ADMIN"), true);
    assert.equal(roleCanAccessDeliveries("STAFF"), true);
  });

  it("rejects unauthenticated, inactive, password-change, and DRIVER accounts", () => {
    assert.equal(canAccessDeliveries(null), false);
    assert.equal(canAccessDeliveries(profile({ role: "DRIVER" })), false);
    assert.equal(roleCanAccessDeliveries("DRIVER"), false);
    assert.equal(canAccessDeliveries(profile({ is_active: false })), false);
    assert.equal(
      canAccessDeliveries(profile({ must_change_password: true })),
      false,
    );
  });

  it("limits assignment mutations to active ADMIN only", () => {
    assert.equal(canManageDeliveryAssignments(profile({ role: "ADMIN" })), true);
    assert.equal(roleCanManageDeliveryAssignments("ADMIN"), true);
    assert.equal(canManageDeliveryAssignments(profile({ role: "STAFF" })), false);
    assert.equal(roleCanManageDeliveryAssignments("STAFF"), false);
    assert.equal(canManageDeliveryAssignments(profile({ role: "DRIVER" })), false);
    assert.equal(roleCanManageDeliveryAssignments("DRIVER"), false);
    assert.equal(
      canManageDeliveryAssignments(profile({ role: "ADMIN", is_active: false })),
      false,
    );
    assert.equal(
      canManageDeliveryAssignments(
        profile({ role: "ADMIN", must_change_password: true }),
      ),
      false,
    );
    assert.equal(canManageDeliveryAssignments(null), false);
  });
});
