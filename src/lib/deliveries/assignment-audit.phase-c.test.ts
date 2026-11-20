import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatAuditDescription,
  formatDeliveryAssignmentDescription,
} from "@/lib/audit-logs/presentation";
import { sanitizeAuditMetadata } from "@/lib/audit-logs/sanitize";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

function extractFunctionBody(sql: string, name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION public.${name}`;
  const start = sql.indexOf(marker);
  assert.ok(start >= 0, `missing ${name}`);
  const next = sql.indexOf("CREATE OR REPLACE FUNCTION public.", start + marker.length);
  const end = next >= 0 ? next : sql.indexOf("REVOKE ALL ON FUNCTION public.", start);
  return sql.slice(start, end > start ? end : undefined);
}

describe("Phase C — delivery assignment audit enrichment", () => {
  const migration = read(
    "supabase/migrations/20261116000100_enrich_delivery_assignment_audit.sql",
  );
  const verify = read(
    "supabase/tests/c_enrich_delivery_assignment_audit_verify.sql",
  );
  const behavioral = read(
    "supabase/tests/c_enrich_delivery_assignment_audit_behavioral.sql",
  );
  const liveBaselineNote = read(
    "supabase/migrations/20261108000300_supply_create_idempotency_and_full_payment.sql",
  );
  const sanitizeSrc = read("src/lib/audit-logs/sanitize.ts");
  const presentationSrc = read("src/lib/audit-logs/presentation.ts");
  const queries = read("src/lib/deliveries/queries.ts");
  const detailPage = read("src/app/app/deliveries/[deliveryId]/page.tsx");
  const assignmentHistory = read(
    "src/components/deliveries/AssignmentHistory.tsx",
  );
  const dispatchDetail = read("src/app/app/assignments/[deliveryId]/page.tsx");

  const driverFn = extractFunctionBody(migration, "set_delivery_driver");
  const staffFn = extractFunctionBody(
    migration,
    "set_delivery_responsible_staff",
  );
  const supplyFn = extractFunctionBody(migration, "create_supply_transaction");

  it("enriches assignment RPCs without a dedicated history table", () => {
    assert.doesNotMatch(
      migration,
      /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?delivery_assignment_history/i,
    );
    assert.doesNotMatch(migration, /CREATE TABLE/);
    assert.match(migration, /IS NOT DISTINCT FROM/);
    assert.match(migration, /DRIVER_CLEARED/);
    assert.match(migration, /DRIVER_ASSIGNED/);
    assert.match(migration, /DRIVER_CHANGED/);
    assert.match(migration, /STAFF_ASSIGNED/);
    assert.match(migration, /STAFF_CHANGED/);
    assert.match(migration, /Responsible staff is required/);
    assert.match(migration, /change_kind/);
    assert.match(migration, /delivery_ref/);
    assert.match(migration, /actor_name/);
    assert.match(
      migration,
      /IF NOT public\.is_admin\(\) THEN\s+RAISE EXCEPTION 'Only administrators may set delivery drivers\.'/,
    );
    assert.match(
      migration,
      /IF NOT public\.is_admin\(\) THEN\s+RAISE EXCEPTION 'Only administrators may set delivery responsibility\.'/,
    );
    assert.match(verify, /no_assignment_history_table/);
    assert.match(verify, /DRIVER_CLEARED/);
  });

  it("retains explicit NULL assignment metadata keys (no jsonb_strip_nulls)", () => {
    assert.doesNotMatch(driverFn, /jsonb_strip_nulls\s*\(/);
    assert.doesNotMatch(staffFn, /jsonb_strip_nulls\s*\(/);
    assert.doesNotMatch(supplyFn, /jsonb_strip_nulls\s*\(/);
    assert.match(driverFn, /'previous_driver_id', previous_driver_id/);
    assert.match(driverFn, /'new_driver_id', p_driver_id/);
    assert.match(staffFn, /'previous_staff_id', previous_staff_id/);
    assert.match(supplyFn, /'previous_staff_id', NULL/);
    assert.match(supplyFn, /'previous_staff_name', NULL/);
    assert.match(verify, /no jsonb_strip_nulls/);
    assert.match(behavioral, /previous_driver_id must be JSON null on initial assign/);
    assert.match(behavioral, /new_driver_id must be JSON null on clear/);
    assert.match(behavioral, /previous_staff_id must be JSON null/);
  });

  it("records initial STAFF_ASSIGNED from create_supply without duplicate retries", () => {
    assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_supply_transaction/);
    assert.match(migration, /DELIVERY_STAFF_SET/);
    assert.match(migration, /'change_kind', 'STAFF_ASSIGNED'/);
    assert.match(migration, /SUPPLY_DISPATCH/);
    assert.match(
      migration,
      /WHERE client_request_id = p_client_request_id/,
    );
    assert.match(
      migration,
      /Concurrent submit with the same request id won the insert/,
    );
    assert.match(
      migration,
      /Full payment in the same transaction \(no separate client round-trip\)/,
    );
    assert.match(
      migration,
      /Initial responsible staff assignment \(C2\)\. Skipped on idempotent retries above/,
    );
    assert.match(behavioral, /C5\.11/);
    assert.match(behavioral, /idempotent retry did not duplicate STAFF_ASSIGNED/);
  });

  it("preserves live create_supply business behavior markers vs Phase C replacement", () => {
    // Live / authoritative markers that must remain after the STAFF_ASSIGNED addition.
    for (const marker of [
      "Only staff or administrators may create supply transactions",
      "A supply request identifier is required",
      "A payment method is required for full payment",
      "A supply must include at least one product line",
      "supply_request_fingerprint",
      "FOR UPDATE",
      "Cannot create supplies for an inactive vendor",
      "unique_violation",
      "This request id was already used for a different supply transaction",
      "Supply line quantities must be positive whole numbers",
      "Supply line unit prices cannot be negative",
      "Supply lines require an active product",
      "SUPPLY_DISPATCH",
      "Vendor supply dispatch",
      "Cannot record payment for a supply with zero total",
      "Delivery created with supply transaction",
      "SUPPLY_CREATED",
      "PAYMENT_RECORDED",
      "payment_status = 'PAID'",
    ]) {
      assert.match(supplyFn, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }

    // Historical migration that introduced paid+idempotent create still documents the contract.
    assert.match(liveBaselineNote, /create_supply_transaction/);
    assert.match(liveBaselineNote, /client_request_id/);
  });

  it("strengthens verify §5 audit_logs SELECT and §6 deliveries write inventory", () => {
    assert.match(verify, /5a\.audit_logs_select_inventory/);
    assert.match(verify, /5b\.audit_logs_admin_select_required/);
    assert.match(verify, /5c\.audit_logs_select_no_staff_driver/);
    assert.match(verify, /5d\.audit_logs_select_nonempty/);
    assert.match(verify, /OR-permit non-ADMIN reads/);
    assert.match(verify, /6a\.deliveries_blocked_write_policies/);
    assert.match(verify, /6b\.deliveries_unexpected_write_policies/);
    assert.match(verify, /UPDATE must be USING false AND WITH CHECK false/);
    assert.match(verify, /may OR-permit direct writes/);
    assert.match(verify, /6c\.deliveries_select_policy_info/);
  });

  it("covers no-op, audit rollback, and failed assignment in behavioral SQL", () => {
    assert.match(behavioral, /v_admin_id/);
    assert.match(behavioral, /admin_id = v_admin_id/);
    assert.match(behavioral, /id IS DISTINCT FROM v_admin_id/);
    assert.match(
      behavioral,
      /v_staff2_id IS NULL OR v_staff2_id IS NOT DISTINCT FROM v_admin_id/,
    );
    assert.match(
      behavioral,
      /second active STAFF\/ADMIN profile distinct from the delivery creator/,
    );
    assert.doesNotMatch(behavioral, /\bstaff_id\b/);
    assert.match(behavioral, /v_delivery_id/);
    assert.match(behavioral, /delivery_id = v_delivery_id/);
    assert.match(behavioral, /UPDATE c_smoke_ctx AS smoke/);
    assert.doesNotMatch(
      behavioral,
      /FROM public\.audit_logs[\s\S]{0,400}?ORDER BY[\s\S]{0,40}?created_at/,
    );
    assert.match(
      behavioral,
      /metadata ->> 'change_kind' = 'DRIVER_CHANGED'/,
    );
    assert.match(
      behavioral,
      /metadata ->> 'change_kind' = 'DRIVER_CLEARED'/,
    );
    assert.match(
      behavioral,
      /metadata ->> 'change_kind' = 'STAFF_CHANGED'/,
    );
    assert.match(behavioral, /C5\.6/);
    assert.match(behavioral, /no-op staff assignment: no audit, no UPDATE/);
    assert.match(behavioral, /no-op driver clear: no audit, no UPDATE/);
    assert.match(behavioral, /updated_at_before/);
    assert.match(behavioral, /updated_by_before/);
    assert.match(behavioral, /C5\.8/);
    assert.match(behavioral, /failed assignment produced no audit/);
    assert.match(behavioral, /C5\.9/);
    assert.match(behavioral, /CHECK \(false\) NOT VALID/);
    assert.match(behavioral, /audit failure rolled back assignment/);
    assert.match(behavioral, /c_smoke_reject_all/);
    assert.match(behavioral, /NEVER COMMIT/);
    assert.doesNotMatch(behavioral, /COMMIT;/);
  });

  it("requires PERMISSIVE on audit_logs_select_admin in verify §5", () => {
    assert.match(verify, /permissive = 'PERMISSIVE'/);
    assert.match(
      verify,
      /p\.policyname = 'audit_logs_select_admin'[\s\S]*?p\.permissive = 'PERMISSIVE'/,
    );
  });

  it("extends sanitize allowlist for approved snapshots only", () => {
    assert.match(sanitizeSrc, /"change_kind"/);
    assert.match(sanitizeSrc, /"delivery_ref"/);
    assert.match(sanitizeSrc, /"actor_name"/);
    assert.match(sanitizeSrc, /"previous_driver_name"/);
    assert.match(sanitizeSrc, /"new_staff_name"/);
    assert.match(sanitizeSrc, /"email"/);
    assert.match(sanitizeSrc, /"password"/);
    assert.match(sanitizeSrc, /"token"/);
    assert.match(presentationSrc, /formatDeliveryAssignmentDescription/);
    assert.match(presentationSrc, /Operational driver changed from/);
    assert.match(presentationSrc, /Responsible staff assigned:/);
  });

  it("shows ADMIN-only Assignment History on delivery detail; edits stay in Dispatch", () => {
    assert.match(queries, /export async function listDeliveryAssignmentHistory/);
    assert.match(queries, /await requireAdmin\(\)/);
    assert.match(queries, /DELIVERY_DRIVER_SET/);
    assert.match(queries, /DELIVERY_STAFF_SET/);
    assert.match(detailPage, /Assignment history/);
    assert.match(detailPage, /listDeliveryAssignmentHistory/);
    assert.match(detailPage, /isAdmin/);
    assert.match(detailPage, /AssignmentHistory/);
    assert.doesNotMatch(detailPage, /AssignDriverForm|AssignStaffForm/);
    assert.match(assignmentHistory, /No assignment changes recorded yet/);
    assert.match(dispatchDetail, /AssignDriverForm|assignDeliveryDriver/);
  });
});

describe("Phase C — assignment metadata presentation & sanitize", () => {
  it("keeps explicit NULL keys through sanitize", () => {
    const cleaned = sanitizeAuditMetadata({
      change_kind: "DRIVER_ASSIGNED",
      previous_driver_id: null,
      new_driver_id: "11111111-1111-4111-8111-111111111111",
      new_driver_name: "Ama",
      new_driver_code: "DRV-2",
      delivery_ref: "NM-DEL-1",
    });
    assert.equal(Object.hasOwn(cleaned, "previous_driver_id"), true);
    assert.equal(cleaned.previous_driver_id, null);
    assert.equal(
      cleaned.new_driver_id,
      "11111111-1111-4111-8111-111111111111",
    );

    const cleared = sanitizeAuditMetadata({
      change_kind: "DRIVER_CLEARED",
      previous_driver_id: "11111111-1111-4111-8111-111111111111",
      previous_driver_name: "Kojo",
      new_driver_id: null,
      driver_id: null,
    });
    assert.equal(Object.hasOwn(cleared, "new_driver_id"), true);
    assert.equal(cleared.new_driver_id, null);

    const initialStaff = sanitizeAuditMetadata({
      change_kind: "STAFF_ASSIGNED",
      previous_staff_id: null,
      previous_staff_name: null,
      previous_staff_role: null,
      new_staff_id: "22222222-2222-4222-8222-222222222222",
      new_staff_name: "Ama Mensah",
    });
    assert.equal(Object.hasOwn(initialStaff, "previous_staff_id"), true);
    assert.equal(initialStaff.previous_staff_id, null);
  });

  it("formats initial assign, clear, and legacy thin rows", () => {
    assert.equal(
      formatDeliveryAssignmentDescription("DELIVERY_DRIVER_SET", {
        change_kind: "DRIVER_ASSIGNED",
        previous_driver_id: null,
        new_driver_name: "Ama",
        new_driver_code: "DRV-2",
        delivery_ref: "NM-DEL-1",
      }),
      "Operational driver assigned: Ama (DRV-2) · NM-DEL-1",
    );
    assert.equal(
      formatDeliveryAssignmentDescription("DELIVERY_DRIVER_SET", {
        change_kind: "DRIVER_CLEARED",
        previous_driver_name: "Kojo",
        previous_driver_code: "DRV-1",
        new_driver_id: null,
      }),
      "Operational driver cleared (was Kojo (DRV-1))",
    );
    assert.equal(
      formatAuditDescription("DELIVERY_STAFF_SET", {
        change_kind: "STAFF_ASSIGNED",
        previous_staff_id: null,
        new_staff_name: "Ama Mensah",
      }),
      "Responsible staff assigned: Ama Mensah",
    );
  });
});
