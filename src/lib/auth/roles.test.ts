import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APP_ROLES,
  PROVISIONABLE_ROLES,
  ROLE_PERMISSIONS,
  isAppRole,
  isProvisionableRole,
} from "@/lib/auth/roles";

describe("application vs provisionable roles", () => {
  it("keeps DRIVER in the database-compatible APP_ROLES set", () => {
    assert.deepEqual([...APP_ROLES], ["ADMIN", "STAFF", "DRIVER"]);
    assert.equal(isAppRole("DRIVER"), true);
    assert.equal(isAppRole("ADMIN"), true);
    assert.equal(isAppRole("GUEST"), false);
  });

  it("limits provisioning to ADMIN and STAFF", () => {
    assert.deepEqual([...PROVISIONABLE_ROLES], ["ADMIN", "STAFF"]);
    assert.equal(isProvisionableRole("ADMIN"), true);
    assert.equal(isProvisionableRole("STAFF"), true);
    assert.equal(isProvisionableRole("DRIVER"), false);
  });

  it("denies STAFF management capabilities reserved for ADMIN", () => {
    assert.equal(ROLE_PERMISSIONS.STAFF.manageProducts, false);
    assert.equal(ROLE_PERMISSIONS.STAFF.manageSuppliers, false);
    assert.equal(ROLE_PERMISSIONS.STAFF.managePurchases, false);
    assert.equal(ROLE_PERMISSIONS.STAFF.manageDrivers, false);
    assert.equal(ROLE_PERMISSIONS.STAFF.manageDeliveryAssignments, false);
    assert.equal(ROLE_PERMISSIONS.STAFF.viewReports, false);
    assert.equal(ROLE_PERMISSIONS.STAFF.viewAuditLogs, false);
    assert.equal(ROLE_PERMISSIONS.STAFF.manageStaff, false);
  });

  it("keeps STAFF operational capabilities", () => {
    assert.equal(ROLE_PERMISSIONS.STAFF.manageVendors, true);
    assert.equal(ROLE_PERMISSIONS.STAFF.manageInventory, true);
    assert.equal(ROLE_PERMISSIONS.STAFF.manageSupplies, true);
    assert.equal(ROLE_PERMISSIONS.STAFF.managePayments, true);
    assert.equal(ROLE_PERMISSIONS.STAFF.manageDeliveries, true);
  });

  it("keeps ADMIN full management access", () => {
    assert.equal(ROLE_PERMISSIONS.ADMIN.manageProducts, true);
    assert.equal(ROLE_PERMISSIONS.ADMIN.manageSuppliers, true);
    assert.equal(ROLE_PERMISSIONS.ADMIN.managePurchases, true);
    assert.equal(ROLE_PERMISSIONS.ADMIN.manageDrivers, true);
    assert.equal(ROLE_PERMISSIONS.ADMIN.manageDeliveryAssignments, true);
    assert.equal(ROLE_PERMISSIONS.ADMIN.viewReports, true);
    assert.equal(ROLE_PERMISSIONS.ADMIN.viewAuditLogs, true);
    assert.equal(ROLE_PERMISSIONS.ADMIN.manageStaff, true);
    assert.equal(ROLE_PERMISSIONS.ADMIN.manageDeliveries, true);
  });

  it("does not grant operational permissions to legacy DRIVER accounts", () => {
    assert.equal(ROLE_PERMISSIONS.DRIVER.manageDeliveries, false);
    assert.equal(ROLE_PERMISSIONS.DRIVER.manageDeliveryAssignments, false);
    assert.equal(ROLE_PERMISSIONS.DRIVER.manageDrivers, false);
    assert.equal(ROLE_PERMISSIONS.DRIVER.manageSupplies, false);
  });
});
