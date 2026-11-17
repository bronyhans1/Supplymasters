import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("Phase D — approved hardening remediations", () => {
  const aclMigration = read(
    "supabase/migrations/20261117000100_phase_d_residual_table_acl_hardening.sql",
  );
  const aclVerify = read("supabase/tests/d_phase_d_residual_acl_verify.sql");
  const bizMigration = read(
    "supabase/migrations/20261117000200_phase_d_purchase_payment_provision_hardening.sql",
  );
  const bizVerify = read(
    "supabase/tests/d_phase_d_purchase_payment_provision_verify.sql",
  );
  const purBehavioral = read(
    "supabase/tests/d_phase_d_purchase_fingerprint_behavioral.sql",
  );
  const adminActions = read("src/lib/admin/users/actions.ts");
  const createForm = read("src/components/admin/CreateUserForm.tsx");
  const paymentsIntegrity = read("src/lib/payments/integrity.test.ts");
  const suppliesIntegrity = read("src/lib/supplies/integrity.test.ts");

  it("D-F6 revokes PUBLIC/anon and narrows authenticated to SELECT on residual tables", () => {
    for (const table of [
      "audit_logs",
      "payments",
      "supplies",
      "inventory",
      "stock_movements",
      "stock_purchases",
      "stock_purchase_items",
      "delivery_stock_returns",
      "delivery_stock_return_items",
    ]) {
      assert.match(
        aclMigration,
        new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM PUBLIC`),
      );
      assert.match(
        aclMigration,
        new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM anon`),
      );
      assert.match(
        aclMigration,
        new RegExp(`GRANT SELECT ON TABLE public\\.${table} TO authenticated`),
      );
    }
    assert.match(aclMigration, /REVOKE SELECT \(/);
    assert.match(aclMigration, /INSERT \(/);
    assert.match(aclMigration, /UPDATE \(/);
    assert.match(aclMigration, /REFERENCES \(/);
    assert.doesNotMatch(aclMigration, /REVOKE ALL \(/);
    assert.doesNotMatch(aclMigration, /DROP POLICY|CREATE POLICY/);
    assert.match(aclVerify, /direct_table_acl/);
    assert.match(aclVerify, /column_privileges_catalog/);
    assert.match(aclVerify, /column_effective_authenticated/);
    assert.match(aclVerify, /rpc_execute_preserved/);
  });

  it("D-PUR-1 adds purchase fingerprint conflict protection", () => {
    assert.match(bizMigration, /client_request_fingerprint/);
    assert.match(bizMigration, /purchase_request_fingerprint/);
    assert.match(bizMigration, /unrecomputable:/);
    assert.doesNotMatch(bizMigration, /legacy:/);
    assert.match(
      bizMigration,
      /FROM public\.stock_purchase_items/,
    );
    assert.match(
      bizMigration,
      /This request id was already used for a different stock purchase/,
    );
    assert.match(bizMigration, /Only administrators may receive stock purchases/);
    assert.match(bizMigration, /stock_purchase_items_quantity_positive/);
    assert.match(bizVerify, /purchase_fingerprint_column/);
    assert.match(bizVerify, /purchase_fingerprint_fn_signature/);
    assert.match(bizVerify, /purchase_fingerprint_fn_grants/);
    assert.match(purBehavioral, /PUR\.replay/);
    assert.match(purBehavioral, /PUR\.conflict/);
    assert.match(purBehavioral, /PUR\.failed_tx/);
    assert.match(purBehavioral, /\$outer\$/);
    assert.match(purBehavioral, /request\.jwt\.claim\.sub/);
    assert.match(purBehavioral, /is_staff_or_admin\(\)/);
    assert.match(purBehavioral, /role = 'ADMIN'/);
    assert.doesNotMatch(purBehavioral, /CREATE OR REPLACE FUNCTION public\.is_admin/);
    assert.match(purBehavioral, /ROLLBACK/);
    assert.doesNotMatch(purBehavioral, /COMMIT;/);
  });

  it("D-PAY-1 revokes authenticated EXECUTE on record_full_payment", () => {
    assert.match(
      bizMigration,
      /REVOKE ALL ON FUNCTION public\.record_full_payment[\s\S]*FROM authenticated/,
    );
    assert.match(
      bizMigration,
      /GRANT EXECUTE ON FUNCTION public\.record_full_payment[\s\S]*TO service_role/,
    );
    assert.match(bizVerify, /record_full_payment is missing/);
    assert.match(bizVerify, /authenticated EXECUTE must be revoked/);
    assert.match(bizVerify, /create_supply_payment_path/);
    assert.match(paymentsIntegrity, /record_full_payment/);
    assert.match(suppliesIntegrity, /create_supply_transaction/);
  });

  it("D-PROV-1 adds USER_PROVISIONED audit and recovery action without password leakage", () => {
    assert.match(bizMigration, /USER_PROVISIONED/);
    assert.match(bizMigration, /is_first_provision/);
    assert.doesNotMatch(bizMigration, /temporaryPassword|temporary_password/);
    assert.match(adminActions, /completeManagedUserProvisioning/);
    assert.match(adminActions, /requireAdmin\(\)/);
    assert.match(adminActions, /partial: true/);
    assert.match(adminActions, /was never logged/i);
    assert.match(adminActions, /Does not create Auth users/);
    assert.doesNotMatch(
      adminActions.slice(
        adminActions.indexOf("export async function completeManagedUserProvisioning"),
      ),
      /createAuthUserForAdmin/,
    );
    assert.match(createForm, /Partial provisioning/);
    assert.match(createForm, /setPassword\(""\)/);
    assert.match(bizVerify, /provisioning audit transition without secrets/);
    assert.match(bizVerify, /admin_set_user_role is missing/);
    assert.match(bizVerify, /first-provision transition flag/);
  });
});
