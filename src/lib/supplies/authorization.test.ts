import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAccessSupplies,
  roleCanAccessSupplies,
} from "@/lib/supplies/authorization";
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

describe("supplies authorization", () => {
  it("allows active admin and staff", () => {
    assert.equal(canAccessSupplies(profile({ role: "ADMIN" })), true);
    assert.equal(canAccessSupplies(profile({ role: "STAFF" })), true);
    assert.equal(roleCanAccessSupplies("ADMIN"), true);
    assert.equal(roleCanAccessSupplies("STAFF"), true);
  });

  it("denies drivers and inactive accounts", () => {
    assert.equal(canAccessSupplies(profile({ role: "DRIVER" })), false);
    assert.equal(roleCanAccessSupplies("DRIVER"), false);
    assert.equal(canAccessSupplies(profile({ is_active: false })), false);
    assert.equal(
      canAccessSupplies(profile({ must_change_password: true })),
      false,
    );
  });
});
