import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261108000100_purchase_receive_idempotency.sql",
);
const fingerprintMigrationPath = join(
  process.cwd(),
  "supabase/migrations/20261117000200_phase_d_purchase_payment_provision_hardening.sql",
);
const formPath = join(process.cwd(), "src/components/purchasing/PurchaseForm.tsx");
const actionsPath = join(process.cwd(), "src/lib/purchasing/actions.ts");
const sqlTestPath = join(process.cwd(), "supabase/tests/purchase_idempotency.sql");

describe("purchase receive idempotency migration contract", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const fingerprintSql = readFileSync(fingerprintMigrationPath, "utf8");
  const form = readFileSync(formPath, "utf8");
  const actions = readFileSync(actionsPath, "utf8");
  const sqlTest = readFileSync(sqlTestPath, "utf8");

  it("adds a unique client_request_id and replaces the receive RPC", () => {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS client_request_id uuid/);
    assert.match(sql, /stock_purchases_client_request_id_key/);
    assert.match(
      sql,
      /DROP FUNCTION IF EXISTS public\.receive_stock_purchase\(uuid, date, jsonb, text, text\)/,
    );
    assert.match(sql, /p_client_request_id uuid/);
    assert.match(sql, /unique_violation/);
    assert.match(sql, /WHERE client_request_id = p_client_request_id/);
    assert.match(
      sql,
      /GRANT EXECUTE ON FUNCTION public\.receive_stock_purchase\(uuid, uuid, date, jsonb, text, text\) TO authenticated/,
    );
  });

  it("reuses one form request id across retries and passes it to the RPC", () => {
    assert.match(form, /useState\(\(\) => createUuid\(\)\)/);
    assert.match(form, /import \{ createUuid \} from "@\/lib\/utils\/id"/);
    assert.doesNotMatch(form, /crypto\.randomUUID/);
    assert.match(form, /clientRequestId/);
    assert.match(form, /Keep clientRequestId so a retry/);
    assert.match(actions, /p_client_request_id: parsed\.clientRequestId/);
  });

  it("ships a PostgreSQL integration test covering replay and concurrency contract", () => {
    assert.match(sqlTest, /stock_purchases_client_request_id_key/);
    assert.match(sqlTest, /Replay did not return the original purchase/);
    assert.match(sqlTest, /duplicate purchases, lines, or PURCHASE movements/);
    assert.match(sqlTest, /Failed receive left a purchase/);
    assert.match(sqlTest, /Concurrent check/);
    assert.match(sqlTest, /Only staff or administrators/);
  });

  it("Phase D fingerprint migration rejects conflicting payloads on the same request id", () => {
    assert.match(fingerprintSql, /purchase_request_fingerprint/);
    assert.match(fingerprintSql, /client_request_fingerprint/);
    assert.match(fingerprintSql, /unrecomputable:/);
    assert.doesNotMatch(fingerprintSql, /legacy:/);
    assert.match(fingerprintSql, /FROM public\.stock_purchase_items/);
    assert.match(
      fingerprintSql,
      /This request id was already used for a different stock purchase/,
    );
    assert.match(fingerprintSql, /Only administrators may receive stock purchases/);
    assert.match(fingerprintSql, /stock_purchase_items_quantity_positive/);
  });
});
