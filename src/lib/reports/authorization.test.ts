import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROLE_PERMISSIONS } from "@/lib/auth/roles";
import {
  canAccessReports,
  canViewAuditLogs,
  roleCanAccessReports,
} from "./authorization";
import type { Profile } from "@/types/profile";

function profile(role: Profile["role"], overrides: Partial<Profile> = {}): Profile {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    email: "user@example.com",
    full_name: "Test User",
    phone: null,
    role,
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("reports authorization", () => {
  it("restricts management reports to ADMIN", () => {
    assert.equal(ROLE_PERMISSIONS.ADMIN.viewReports, true);
    assert.equal(ROLE_PERMISSIONS.STAFF.viewReports, false);
    assert.equal(ROLE_PERMISSIONS.DRIVER.viewReports, false);
    assert.equal(roleCanAccessReports("ADMIN"), true);
    assert.equal(roleCanAccessReports("STAFF"), false);
    assert.equal(roleCanAccessReports("DRIVER"), false);
  });

  it("requires an active ADMIN profile that finished password change", () => {
    assert.equal(canAccessReports(profile("ADMIN")), true);
    assert.equal(canAccessReports(profile("STAFF")), false);
    assert.equal(canAccessReports(profile("ADMIN", { is_active: false })), false);
    assert.equal(
      canAccessReports(profile("ADMIN", { must_change_password: true })),
      false,
    );
    assert.equal(canAccessReports(null), false);
  });

  it("keeps audit logs ADMIN-only", () => {
    assert.equal(canViewAuditLogs(profile("ADMIN")), true);
    assert.equal(canViewAuditLogs(profile("STAFF")), false);
    assert.equal(ROLE_PERMISSIONS.STAFF.viewAuditLogs, false);
  });
});
