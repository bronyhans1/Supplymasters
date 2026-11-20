import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261119000100_supply_pending_payment_decouple.sql",
);
const verifyPath = join(
  process.cwd(),
  "supabase/tests/w_supply_pending_payment_decouple_verify.sql",
);
const actionsPath = join(process.cwd(), "src/lib/supplies/actions.ts");
const formPath = join(process.cwd(), "src/components/supplies/SupplyForm.tsx");
const paymentActionsPath = join(process.cwd(), "src/lib/payments/actions.ts");

describe("supply pending payment decouple migration contract", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const verify = readFileSync(verifyPath, "utf8");
  const actions = readFileSync(actionsPath, "utf8");
  const form = readFileSync(formPath, "utf8");
  const paymentActions = readFileSync(paymentActionsPath, "utf8");

  it("creates unpaid supplies without inserting payments", () => {
    assert.match(sql, /payment_status,\s*[\s\S]*'UNPAID'/);
    assert.match(sql, /Payment obligation is supplies\.payment_status = UNPAID/);
    assert.doesNotMatch(
      sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.create_supply_transaction")),
      /INSERT INTO public\.payments/,
    );
    assert.match(sql, /p_notes text DEFAULT NULL/);
    assert.doesNotMatch(
      sql.match(
        /CREATE OR REPLACE FUNCTION public\.create_supply_transaction\([\s\S]*?RETURNS public\.supplies/,
      )?.[0] ?? "",
      /p_payment_method/,
    );
  });

  it("restores authenticated EXECUTE on record_full_payment", () => {
    assert.match(
      sql,
      /GRANT EXECUTE ON FUNCTION public\.record_full_payment[\s\S]*TO authenticated/,
    );
  });

  it("wires app createSupply without payment fields and recordFullPayment separately", () => {
    assert.match(actions, /createSupply/);
    assert.match(actions, /rpc\(\s*["']create_supply_transaction["']/);
    assert.doesNotMatch(actions, /p_payment_method/);
    assert.doesNotMatch(form, /paymentMethod|Payment method/);
    assert.match(paymentActions, /rpc\(\s*["']record_full_payment["']/);
  });

  it("drops the caller before the fingerprint helper and does not use CASCADE", () => {
    const dropCaller = sql.indexOf(
      "DROP FUNCTION IF EXISTS public.create_supply_transaction",
    );
    const dropFingerprint = sql.indexOf(
      "DROP FUNCTION IF EXISTS public.supply_request_fingerprint",
    );
    const createFingerprint = sql.indexOf(
      "CREATE OR REPLACE FUNCTION public.supply_request_fingerprint",
    );
    const createCaller = sql.indexOf(
      "CREATE OR REPLACE FUNCTION public.create_supply_transaction",
    );
    assert.ok(dropCaller >= 0);
    assert.ok(dropFingerprint > dropCaller);
    assert.ok(createFingerprint > dropFingerprint);
    assert.ok(createCaller > createFingerprint);
    assert.doesNotMatch(sql, /DROP FUNCTION[\s\S]{0,240}CASCADE/i);
    assert.match(sql, /supply_request_matches_persisted/);
  });

  it("ships rollback verification for unpaid create, replay, conflict, and payment denial", () => {
    assert.match(verify, /ROLLBACK/);
    assert.doesNotMatch(verify, /\nCOMMIT;/);
    assert.match(verify, /payment_status IS DISTINCT FROM 'UNPAID'/);
    assert.match(verify, /duplicate client_request_id returned the original supply/);
    assert.match(verify, /conflicting fingerprint\/payload rejected/);
    assert.match(verify, /SET LOCAL ROLE anon/);
    assert.match(verify, /NOT VERIFIED/);
    assert.match(sql, /NOT APPLIED until separately approved/);
  });
});
