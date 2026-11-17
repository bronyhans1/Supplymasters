import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessInventory,
  roleCanAccessInventory,
} from "@/lib/inventory/authorization";
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

describe("inventory authorization", () => {
  it("allows active admin and staff", () => {
    assert.equal(canAccessInventory(profile({ role: "ADMIN" })), true);
    assert.equal(canAccessInventory(profile({ role: "STAFF" })), true);
    assert.equal(roleCanAccessInventory("ADMIN"), true);
    assert.equal(roleCanAccessInventory("STAFF"), true);
  });

  it("denies drivers, inactive accounts, and forced password change", () => {
    assert.equal(canAccessInventory(profile({ role: "DRIVER" })), false);
    assert.equal(roleCanAccessInventory("DRIVER"), false);
    assert.equal(canAccessInventory(profile({ is_active: false })), false);
    assert.equal(
      canAccessInventory(profile({ must_change_password: true })),
      false,
    );
    assert.equal(canAccessInventory(null), false);
  });
});
