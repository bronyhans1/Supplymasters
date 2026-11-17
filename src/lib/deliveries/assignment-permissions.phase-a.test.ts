import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("Phase A — ADMIN-only delivery assignment permissions", () => {
  const migration = read(
    "supabase/migrations/20261115000100_admin_only_delivery_assignments.sql",
  );
  const verify = read(
    "supabase/tests/a_admin_only_delivery_assignments_verify.sql",
  );
  const actions = read("src/lib/deliveries/actions.ts");
  const queries = read("src/lib/deliveries/queries.ts");
  const detailPage = read("src/app/app/deliveries/[deliveryId]/page.tsx");
  const roles = read("src/lib/auth/roles.ts");
  const transitions = read("src/lib/deliveries/transitions.ts");

  it("gates assignment RPCs with is_admin and preserves signatures", () => {
    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.set_delivery_driver/);
    assert.match(
      migration,
      /CREATE OR REPLACE FUNCTION public\.set_delivery_responsible_staff/,
    );
    assert.match(
      migration,
      /IF NOT public\.is_admin\(\) THEN\s+RAISE EXCEPTION 'Only administrators may set delivery drivers\.'/,
    );
    assert.match(
      migration,
      /IF NOT public\.is_admin\(\) THEN\s+RAISE EXCEPTION 'Only administrators may set delivery responsibility\.'/,
    );
    assert.doesNotMatch(
      migration,
      /set_delivery_driver[\s\S]*IF NOT public\.is_staff_or_admin\(\)/,
    );
    assert.doesNotMatch(
      migration,
      /set_delivery_responsible_staff[\s\S]*IF NOT public\.is_staff_or_admin\(\)/,
    );
    assert.match(
      migration,
      /jsonb_build_object\('driver_id', p_driver_id\)/,
    );
    assert.match(
      migration,
      /jsonb_build_object\('responsible_staff_id', p_staff_id\)/,
    );
    assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.set_delivery_driver/);
    assert.match(
      migration,
      /GRANT EXECUTE ON FUNCTION public\.set_delivery_responsible_staff/,
    );
  });

  it("does not introduce assignment history table or alter status RPC", () => {
    assert.doesNotMatch(migration, /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?delivery_assignments/i);
    assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.update_delivery_status/);
    assert.doesNotMatch(migration, /CREATE TABLE/);
    assert.match(migration, /Does NOT introduce delivery_assignments history table/);
    assert.match(verify, /update_delivery_status remains staff\/admin/);
    assert.match(verify, /STAFF denied set_delivery_driver/);
    assert.match(verify, /3a\.deliveries_blocked_write_policies/);
    assert.match(verify, /3b\.deliveries_unexpected_write_policies/);
    assert.match(verify, /FAIL — unexpected write\/ALL policy/);
    assert.match(verify, /may OR-permit direct writes/);
    assert.match(verify, /CATALOG NOTE — runtime smoke required/);
    assert.match(migration, /GRANT EXECUTE TO service_role does NOT bypass/);
  });

  it("requires ADMIN on assignment Server Actions and keeps status for STAFF", () => {
    const driverAction = actions.match(
      /export async function assignDeliveryDriver\([\s\S]*?\n\}/,
    )?.[0];
    const staffAction = actions.match(
      /export async function assignDeliveryResponsibleStaff\([\s\S]*?\n\}/,
    )?.[0];
    const statusAction = actions.match(
      /export async function updateDeliveryStatusAction\([\s\S]*?\n\}/,
    )?.[0];

    assert.ok(driverAction);
    assert.ok(staffAction);
    assert.ok(statusAction);
    assert.match(driverAction, /await requireAdmin\(\)/);
    assert.match(staffAction, /await requireAdmin\(\)/);
    assert.doesNotMatch(driverAction, /requireStaffOrAdmin/);
    assert.doesNotMatch(staffAction, /requireStaffOrAdmin/);
    assert.match(statusAction, /await requireStaffOrAdmin\(\)/);
    assert.doesNotMatch(statusAction, /requireAdmin\(\)/);
  });

  it("gates assignment option loaders with requireAdmin", () => {
    const driversLoader = queries.match(
      /export async function listActiveDriversForAssignment\([\s\S]*?\n\}/,
    )?.[0];
    const staffLoader = queries.match(
      /export async function listEligibleStaffForAssignment\([\s\S]*?\n\}/,
    )?.[0];
    const staffFilterLoader = queries.match(
      /export async function listStaffForFilter\([\s\S]*?\n\}/,
    )?.[0];
    const filterLoader = queries.match(
      /export async function listDriversForFilter\([\s\S]*?\n\}/,
    )?.[0];

    assert.ok(driversLoader);
    assert.ok(staffLoader);
    assert.ok(staffFilterLoader);
    assert.ok(filterLoader);
    assert.match(driversLoader, /await requireAdmin\(\)/);
    assert.match(staffLoader, /await requireAdmin\(\)/);
    assert.match(staffFilterLoader, /await requireStaffOrAdmin\(\)/);
    assert.match(filterLoader, /await requireStaffOrAdmin\(\)/);
  });

  it("keeps delivery detail read-only for assignments; mutations live in Dispatch", () => {
    assert.doesNotMatch(detailPage, /AssignDriverForm/);
    assert.doesNotMatch(detailPage, /AssignStaffForm/);
    assert.doesNotMatch(detailPage, /canManageDeliveryAssignments/);
    assert.doesNotMatch(detailPage, /showDriverAssign|showStaffAssign/);
    assert.match(detailPage, /Responsible staff/);
    assert.match(detailPage, /Assigned driver/);
    assert.match(detailPage, /UpdateStatusForm/);
    assert.match(
      detailPage,
      /No driver assigned\. Deliveries can proceed without a driver\./,
    );
  });

  it("keeps ROLE_PERMISSIONS assignment flag ADMIN-only and status workflows intact", () => {
    assert.match(roles, /manageDeliveryAssignments: true/);
    assert.match(roles, /manageDeliveryAssignments: false/);
    assert.match(roles, /manageDeliveries: true/);
    assert.match(transitions, /canAssignOrClearDeliveryDriver/);
    assert.match(transitions, /allowedNextStatuses/);
    assert.doesNotMatch(transitions, /driver.*required/i);
    assert.doesNotMatch(transitions, /conflict/i);
  });
});
