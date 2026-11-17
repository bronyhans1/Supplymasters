import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261109000100_delivery_stock_return_idempotency.sql",
);
const formPath = join(process.cwd(), "src/components/returns/RecordReturnForm.tsx");
const actionsPath = join(process.cwd(), "src/lib/returns/actions.ts");
const presentationPath = join(process.cwd(), "src/lib/returns/presentation.ts");
const sqlTestPath = join(
  process.cwd(),
  "supabase/tests/delivery_stock_return_idempotency.sql",
);

describe("delivery stock return idempotency migration contract", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const form = readFileSync(formPath, "utf8");
  const actions = readFileSync(actionsPath, "utf8");
  const presentation = readFileSync(presentationPath, "utf8");
  const sqlTest = readFileSync(sqlTestPath, "utf8");

  it("adds return_ref, client_request_id/fingerprint, and replaces the return RPC", () => {
    assert.match(sql, /^BEGIN;/m);
    assert.match(sql, /^COMMIT;/m);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS return_ref text/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS client_request_id uuid/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS client_request_fingerprint text/);
    assert.match(sql, /delivery_stock_returns_client_request_id_key/);
    assert.match(sql, /delivery_stock_returns_return_ref_key/);
    assert.match(sql, /NM-RET-/);
    assert.match(sql, /VALUES \('return', 'NM-RET-', 0\)/);
    assert.match(sql, /delivery_stock_return_request_fingerprint/);
    assert.match(
      sql,
      /encode\(extensions\.digest\(canonical::text, 'sha256'\), 'hex'\)/,
    );
    assert.match(sql, /CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions/);
    assert.match(
      sql,
      /DROP FUNCTION IF EXISTS public\.record_delivery_stock_return\(uuid, jsonb, text\)/,
    );
    assert.match(sql, /p_client_request_id uuid/);
    assert.match(sql, /unique_violation/);
    assert.match(
      sql,
      /client_request_fingerprint IS DISTINCT FROM request_fingerprint/,
    );
    assert.match(sql, /item_product_id::text/);
    assert.match(sql, /jsonb_agg\(line ORDER BY line ->> 'product_id'\)/);
    assert.match(sql, /Supported execution method/);
    assert.match(sql, /Do not paste this file into an already-open interactive transaction/);
    assert.doesNotMatch(sql, /nested BEGIN is harmless/);
    assert.match(sql, /Re-check idempotency after acquiring the delivery lock/);
    assert.match(sql, /Return code sequence exhausted/);
    assert.match(sql, /Duplicate product lines are not allowed/);
    assert.doesNotMatch(actions, /\.from\(\s*["']inventory["']\s*\)\s*\.update/);
  });

  it("backfills existing return references without creating stock movements", () => {
    assert.match(sql, /Backfill business references for existing rows/);
    assert.match(sql, /WHERE return_ref IS NULL OR btrim\(return_ref\) = ''/);
    assert.match(sql, /legacy:' \|\| id::text/);
    assert.doesNotMatch(sql, /apply_stock_movement\([\s\S]*Backfill/);
  });

  it("reuses one form request id across retries and rotates after success or payload change", () => {
    assert.match(form, /useState\(\(\) =>[\s\S]*createUuid\(\)/);
    assert.match(form, /import \{ createUuid \} from "@\/lib\/utils\/id"/);
    assert.match(form, /clientRequestId/);
    assert.match(form, /REQUEST_CONFLICT|uncertain/i);
    assert.match(form, /Keep clientRequestId so a retry/);
    assert.match(form, /payloadKey/);
    assert.match(form, /setClientRequestId\(createUuid\(\)\)/);
    assert.doesNotMatch(form, /crypto\.randomUUID/);
    assert.match(actions, /p_client_request_id: parsed\.clientRequestId/);
    assert.match(presentation, /\(NM\|SM\)-RET-\[0-9\]\{6\}/);
    assert.doesNotMatch(presentation, /RET-\$\{compact\}/);
  });

  it("ships a PostgreSQL integration test for replay, conflicts, refs, and stock safety", () => {
    assert.match(sqlTest, /delivery_stock_returns_client_request_id_key/);
    assert.match(sqlTest, /delivery_stock_returns_return_ref_key/);
    assert.match(sqlTest, /client_request_fingerprint/);
    assert.match(sqlTest, /Replay did not return the original return/);
    assert.match(sqlTest, /Replay duplicated return, item, movement, or stock change/);
    assert.match(sqlTest, /Expected conflict for different delivery id/);
    assert.match(sqlTest, /Expected conflict for different quantity/);
    assert.match(sqlTest, /Expected conflict for different notes/);
    assert.match(sqlTest, /Whitespace-only notes did not normalize/);
    assert.match(sqlTest, /UUID case normalization failed/);
    assert.match(sqlTest, /upper\(v_product_id::text\)/);
    assert.match(sqlTest, /Reordered identical product lines did not replay/);
    assert.match(sqlTest, /Failed return left a delivery_stock_returns row/);
    assert.match(sqlTest, /Backfill integrity failed/);
    assert.match(sqlTest, /extensions\.digest/);
    assert.match(sqlTest, /Concurrent check is MANUAL/);
    assert.match(sqlTest, /Concurrent behavior was NOT automatically verified/);
    assert.match(sqlTest, /NM-RET-\[0-9\]\{6\}/);
  });
});
