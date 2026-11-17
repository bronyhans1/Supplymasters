import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261108000300_supply_create_idempotency_and_full_payment.sql",
);
const formPath = join(process.cwd(), "src/components/supplies/SupplyForm.tsx");
const actionsPath = join(process.cwd(), "src/lib/supplies/actions.ts");
const sqlTestPath = join(
  process.cwd(),
  "supabase/tests/supply_create_idempotency.sql",
);

describe("supply create idempotency migration contract", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const form = readFileSync(formPath, "utf8");
  const actions = readFileSync(actionsPath, "utf8");
  const sqlTest = readFileSync(sqlTestPath, "utf8");

  it("adds unique client_request_id/fingerprint and replaces create_supply_transaction with paid create", () => {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS client_request_id uuid/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS client_request_fingerprint text/);
    assert.match(sql, /supplies_client_request_id_key/);
    assert.match(sql, /supply_request_fingerprint/);
    assert.match(
      sql,
      /encode\(extensions\.digest\(canonical::text, 'sha256'\), 'hex'\)/,
    );
    assert.match(sql, /CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions/);
    assert.match(
      sql,
      /DROP FUNCTION IF EXISTS public\.create_supply_transaction\(uuid, date, jsonb, text\)/,
    );
    assert.match(sql, /p_client_request_id uuid/);
    assert.match(sql, /p_payment_method public\.payment_method/);
    assert.match(sql, /payment_status = 'PAID'/);
    assert.match(sql, /unique_violation/);
    assert.match(sql, /client_request_fingerprint IS DISTINCT FROM request_fingerprint/);
    assert.doesNotMatch(actions, /\.from\(\s*["']inventory["']\s*\)\s*\.update/);
  });

  it("reuses one form request id across retries and rotates after success", () => {
    assert.match(form, /useState\(\(\) =>[\s\S]*createUuid\(\)/);
    assert.match(form, /import \{ createUuid \} from "@\/lib\/utils\/id"/);
    assert.match(form, /clientRequestId/);
    assert.match(form, /REQUEST_CONFLICT|Uncertain|uncertain/);
    assert.doesNotMatch(form, /crypto\.randomUUID/);
    assert.match(actions, /p_client_request_id: parsed\.clientRequestId/);
    assert.match(actions, /p_payment_method: parsed\.paymentMethod/);
  });

  it("ships a PostgreSQL integration test for replay, payload conflicts, and stock safety", () => {
    assert.match(sqlTest, /supplies_client_request_id_key/);
    assert.match(sqlTest, /client_request_fingerprint/);
    assert.match(sqlTest, /Replay did not return the original supply/);
    assert.match(sqlTest, /Replay duplicated supply, payment, movement, or stock change/);
    assert.match(sqlTest, /Expected conflict for different vendor/);
    assert.match(sqlTest, /Expected conflict for different product/);
    assert.match(sqlTest, /Expected conflict for different quantity/);
    assert.match(sqlTest, /Expected conflict for different unit price/);
    assert.match(sqlTest, /Expected conflict for different payment method/);
    assert.match(sqlTest, /Expected conflict for different transaction reference/);
    assert.match(sqlTest, /Expected conflict for different supply date/);
    assert.match(sqlTest, /Expected conflict for different notes/);
    assert.match(sqlTest, /Reordered identical product lines did not replay/);
    assert.match(sqlTest, /Failed supply left supply\/payment\/delivery\/history\/movement/);
    assert.match(sqlTest, /extensions\.digest/);
    assert.match(sqlTest, /Concurrent check/);
  });
});

