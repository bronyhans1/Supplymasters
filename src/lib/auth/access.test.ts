import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateAppAccess,
  evaluatePasswordChangeAccess,
  isProtectedAppPath,
  isSignInPath,
  postSignInPath,
  requiresAuthenticatedSession,
  roleHomePath,
} from "@/lib/auth/access";
import type { Profile } from "@/types/profile";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
    full_name: "Test User",
    phone: null,
    role: "STAFF",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("roleHomePath", () => {
  it("maps each role to its home area", () => {
    assert.equal(roleHomePath("ADMIN"), "/app/admin");
    assert.equal(roleHomePath("STAFF"), "/app/staff");
    // Legacy DRIVER accounts still land on the retired unsupported-account page.
    assert.equal(roleHomePath("DRIVER"), "/app/driver");
  });
});

describe("postSignInPath", () => {
  it("sends users with must_change_password to the password-change page", () => {
    assert.equal(
      postSignInPath(profile({ must_change_password: true, role: "ADMIN" })),
      "/change-password",
    );
  });

  it("sends completed ADMIN and STAFF users to their operational homes", () => {
    assert.equal(postSignInPath(profile({ role: "ADMIN" })), "/app/admin");
    assert.equal(postSignInPath(profile({ role: "STAFF" })), "/app/staff");
  });

  it("sends legacy DRIVER accounts to the retired driver route", () => {
    assert.equal(postSignInPath(profile({ role: "DRIVER" })), "/app/driver");
  });
});

describe("evaluateAppAccess", () => {
  it("rejects missing profiles", () => {
    assert.deepEqual(evaluateAppAccess(null), { status: "unauthenticated" });
  });

  it("rejects inactive accounts", () => {
    assert.deepEqual(evaluateAppAccess(profile({ is_active: false })), {
      status: "inactive",
    });
  });

  it("requires password change before app access", () => {
    assert.deepEqual(evaluateAppAccess(profile({ must_change_password: true })), {
      status: "password_change_required",
      redirectTo: "/change-password",
    });
  });

  it("allows active users who completed password change", () => {
    assert.deepEqual(evaluateAppAccess(profile({ role: "STAFF" })), {
      status: "allowed",
      redirectTo: "/app/staff",
    });
  });
});

describe("evaluatePasswordChangeAccess", () => {
  it("sends users who no longer need a change to their role home", () => {
    assert.deepEqual(evaluatePasswordChangeAccess(profile({ role: "ADMIN" })), {
      status: "allowed",
      redirectTo: "/app/admin",
    });
  });

  it("keeps users on the password-change path when required", () => {
    assert.deepEqual(
      evaluatePasswordChangeAccess(profile({ must_change_password: true })),
      {
        status: "password_change_required",
        redirectTo: "/change-password",
      },
    );
  });
});

describe("path helpers", () => {
  it("classifies protected and auth paths", () => {
    assert.equal(isProtectedAppPath("/app"), true);
    assert.equal(isProtectedAppPath("/app/admin"), true);
    assert.equal(isProtectedAppPath("/sign-in"), false);
    assert.equal(isSignInPath("/sign-in"), true);
    assert.equal(requiresAuthenticatedSession("/change-password"), true);
    assert.equal(requiresAuthenticatedSession("/"), false);
  });
});
