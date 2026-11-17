import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261109000400_admin_staff_permission_alignment.sql",
);
const verifyPath = join(
  process.cwd(),
  "supabase/tests/c1_admin_staff_permission_alignment_verify.sql",
);
const rolesPath = join(process.cwd(), "src/lib/auth/roles.ts");
const productsActionsPath = join(
  process.cwd(),
  "src/lib/master-data/products/actions.ts",
);
const purchasingActionsPath = join(process.cwd(), "src/lib/purchasing/actions.ts");

describe("admin/staff permission alignment migration contract", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const verify = readFileSync(verifyPath, "utf8");
  const roles = readFileSync(rolesPath, "utf8");
  const productActions = readFileSync(productsActionsPath, "utf8");
  const purchaseActions = readFileSync(purchasingActionsPath, "utf8");

  it("makes product/supplier/driver writes ADMIN-only in RLS", () => {
    assert.match(sql, /CREATE POLICY products_insert_admin/);
    assert.match(sql, /CREATE POLICY products_update_admin/);
    assert.match(sql, /CREATE POLICY stock_suppliers_select_admin/);
    assert.match(sql, /CREATE POLICY drivers_insert_admin/);
    assert.match(sql, /WITH CHECK \(public\.is_admin\(\)\)/);
    assert.doesNotMatch(sql, /CREATE POLICY products_insert_staff_admin/);
  });

  it("changes receive_stock_purchase to is_admin authorization", () => {
    assert.match(sql, /IF NOT public\.is_admin\(\) THEN/);
    assert.match(
      sql,
      /Only administrators may receive stock purchases/,
    );
    assert.doesNotMatch(
      sql,
      /IF NOT public\.is_staff_or_admin\(\) THEN\s+RAISE EXCEPTION 'Only staff or administrators may receive stock purchases/,
    );
  });

  it("keeps STAFF delivery/select driver path and operational RPC EXECUTE grants", () => {
    assert.match(sql, /SELECT stays staff\/admin for deliveries/);
    assert.doesNotMatch(sql, /DROP POLICY IF EXISTS drivers_select_staff_admin/);
    assert.match(verify, /STAFF can still SELECT drivers/);
    assert.match(verify, /create_supply_transaction/);
    assert.match(verify, /adjust_inventory/);
    assert.match(verify, /update_delivery_status/);
    // Assignment RPCs moved ADMIN-only in Phase A (see a_admin_only_delivery_assignments*).
    assert.match(verify, /Phase A ADMIN-only/);
  });

  it("aligns application ROLE_PERMISSIONS and server actions", () => {
    assert.match(roles, /manageProducts: false/);
    assert.match(roles, /manageDrivers: false/);
    assert.match(roles, /managePurchases: false/);
    assert.match(roles, /viewReports: false/);
    assert.match(productActions, /requireAdmin/);
    assert.match(purchaseActions, /requireAdmin/);
    assert.doesNotMatch(productActions, /requireStaffOrAdmin/);
    assert.doesNotMatch(purchaseActions, /requireStaffOrAdmin/);
  });
});
