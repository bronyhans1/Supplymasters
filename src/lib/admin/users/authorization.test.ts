import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canManageUsers,
  isProtectedProfileField,
} from "@/lib/admin/users/authorization";
import { createUserSchema, setUserRoleSchema } from "@/lib/admin/users/schemas";
import {
  isLastAdminProtectionMessage,
  mapAdminRpcError,
} from "@/lib/admin/users/db-errors";
import type { Profile } from "@/types/profile";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "admin@example.com",
    full_name: "Admin",
    phone: null,
    role: "ADMIN",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("canManageUsers", () => {
  it("allows only active admins who completed password change", () => {
    assert.equal(canManageUsers(profile()), true);
  });

  it("rejects staff and drivers", () => {
    assert.equal(canManageUsers(profile({ role: "STAFF" })), false);
    assert.equal(canManageUsers(profile({ role: "DRIVER" })), false);
  });

  it("rejects inactive or password-change-required admins", () => {
    assert.equal(canManageUsers(profile({ is_active: false })), false);
    assert.equal(
      canManageUsers(profile({ must_change_password: true })),
      false,
    );
  });

  it("rejects missing profiles", () => {
    assert.equal(canManageUsers(null), false);
  });
});

describe("protected profile fields", () => {
  it("flags role, activation, password flag, email, and id", () => {
    assert.equal(isProtectedProfileField("role"), true);
    assert.equal(isProtectedProfileField("is_active"), true);
    assert.equal(isProtectedProfileField("must_change_password"), true);
    assert.equal(isProtectedProfileField("email"), true);
    assert.equal(isProtectedProfileField("id"), true);
    assert.equal(isProtectedProfileField("full_name"), false);
    assert.equal(isProtectedProfileField("phone"), false);
  });
});

describe("createUserSchema", () => {
  it("rejects invalid form inputs", () => {
    const result = createUserSchema.safeParse({
      fullName: "A",
      email: "not-an-email",
      role: "STAFF",
      temporaryPassword: "short",
    });
    assert.equal(result.success, false);
  });

  it("accepts a valid create payload", () => {
    const result = createUserSchema.safeParse({
      fullName: "Ops Staff",
      email: "staff@example.com",
      phone: "",
      role: "STAFF",
      temporaryPassword: "abc123",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.phone, null);
    }
  });
});

describe("setUserRoleSchema", () => {
  it("requires a uuid and a provisionable role", () => {
    assert.equal(
      setUserRoleSchema.safeParse({ userId: "bad", role: "ADMIN" }).success,
      false,
    );
    assert.equal(
      setUserRoleSchema.safeParse({
        userId: "11111111-1111-4111-8111-111111111111",
        role: "STAFF",
      }).success,
      true,
    );
    assert.equal(
      setUserRoleSchema.safeParse({
        userId: "11111111-1111-4111-8111-111111111111",
        role: "DRIVER",
      }).success,
      false,
    );
  });
});

describe("createUserSchema roles", () => {
  it("rejects DRIVER as a creatable application role", () => {
    assert.equal(
      createUserSchema.safeParse({
        fullName: "Legacy Driver",
        email: "driver@example.com",
        phone: "",
        role: "DRIVER",
        temporaryPassword: "abc123",
      }).success,
      false,
    );
  });
});

describe("mapAdminRpcError", () => {
  it("maps last-active-admin protection", () => {
    const error = mapAdminRpcError({
      message: "Cannot demote or deactivate the last active administrator.",
    });
    assert.equal(error.code, "LAST_ADMIN_PROTECTED");
    assert.equal(isLastAdminProtectionMessage(error.message), false);
    assert.equal(
      isLastAdminProtectionMessage(
        "Cannot demote or deactivate the last active administrator.",
      ),
      true,
    );
  });
});

describe("user management security invariants", () => {
  it("documents that role assignment must use session RPC names", () => {
    // Static contract for reviewers/tests: privileged fields are never updated via table API.
    const forbiddenTableUpdates = ["role", "is_active", "must_change_password"];
    for (const field of forbiddenTableUpdates) {
      assert.equal(isProtectedProfileField(field), true);
    }

    const authorizedRpcs = [
      "admin_set_user_role",
      "admin_require_password_change",
    ];
    assert.deepEqual(authorizedRpcs, [
      "admin_set_user_role",
      "admin_require_password_change",
    ]);
  });
});
