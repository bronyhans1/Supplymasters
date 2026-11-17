import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261108000200_adjust_inventory_idempotency.sql",
);
const formPath = join(
  process.cwd(),
  "src/components/inventory/AdjustInventoryForm.tsx",
);
const actionsPath = join(process.cwd(), "src/lib/inventory/actions.ts");
const sqlTestPath = join(
  process.cwd(),
  "supabase/tests/adjust_inventory_idempotency.sql",
);

describe("stock adjustment idempotency migration contract", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const form = readFileSync(formPath, "utf8");
  const actions = readFileSync(actionsPath, "utf8");
  const sqlTest = readFileSync(sqlTestPath, "utf8");

  it("adds a unique client_request_id and replaces adjust_inventory", () => {
    assert.match(sql, /ADD COLUMN IF NOT EXISTS client_request_id uuid/);
    assert.match(sql, /stock_movements_client_request_id_key/);
    assert.match(
      sql,
      /DROP FUNCTION IF EXISTS public\.adjust_inventory\(uuid, integer, text\)/,
    );
    assert.match(sql, /p_client_request_id uuid/);
    assert.match(sql, /unique_violation/);
    assert.match(sql, /different stock adjustment/);
    assert.match(
      sql,
      /GRANT EXECUTE ON FUNCTION public\.adjust_inventory\(uuid, uuid, integer, text\) TO authenticated/,
    );
  });

  it("reuses one form request id across retries and rotates only after success", () => {
    assert.match(form, /useState\(\(\) =>[\s\S]*createUuid\(\)/);
    assert.match(form, /import \{ createUuid \} from "@\/lib\/utils\/id"/);
    assert.match(form, /clientRequestId/);
    assert.match(form, /Keep clientRequestId so a retry/);
    assert.match(form, /Uncertain outcome/);
    assert.match(form, /setClientRequestId\(createUuid\(\)\)/);
    assert.match(form, /REQUEST_CONFLICT/);
    assert.doesNotMatch(form, /crypto\.randomUUID/);
    assert.match(actions, /p_client_request_id: parsed\.clientRequestId/);
    assert.doesNotMatch(actions, /not idempotent/i);
  });

  it("ships a PostgreSQL integration test covering replay, conflict, and concurrency contract", () => {
    assert.match(sqlTest, /stock_movements_client_request_id_key/);
    assert.match(sqlTest, /Replay did not return the original adjustment movement/);
    assert.match(sqlTest, /Replay created another movement or changed inventory again/);
    assert.match(sqlTest, /Expected payload conflict for reused request id/);
    assert.match(sqlTest, /Failed adjustment left a movement/);
    assert.match(sqlTest, /Concurrent check/);
    assert.match(sqlTest, /Only staff or administrators|unauthorized/);
    assert.match(sqlTest, /Insufficient stock/);
  });
});
