import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("inventory integrity safeguards", () => {
  it("adjusts stock only through idempotent adjust_inventory RPC", () => {
    const actions = readSrc("src/lib/inventory/actions.ts");
    assert.match(actions, /rpc\(\s*["']adjust_inventory["']/);
    assert.match(actions, /p_client_request_id: parsed\.clientRequestId/);
    assert.doesNotMatch(actions, /\.from\(\s*["']inventory["']\s*\)\s*\.update/);
    assert.doesNotMatch(actions, /\.from\(\s*["']inventory["']\s*\)\s*\.insert/);
    assert.doesNotMatch(
      actions,
      /\.from\(\s*["']stock_movements["']\s*\)\s*\.insert/,
    );
    assert.doesNotMatch(actions, /not idempotent/i);
  });

  it("keeps purchase receiving on receive_stock_purchase with client_request_id", () => {
    const purchasing = readSrc("src/lib/purchasing/actions.ts");
    assert.match(purchasing, /rpc\(\s*["']receive_stock_purchase["']/);
    assert.match(purchasing, /p_client_request_id/);
    assert.doesNotMatch(
      purchasing,
      /\.from\(\s*["']inventory["']\s*\)\s*\.update/,
    );
  });

  it("documents that inventory queries are read-only selects", () => {
    const queries = readSrc("src/lib/inventory/queries.ts");
    assert.match(queries, /\.from\(\s*["']inventory["']\s*\)/);
    assert.match(queries, /\.from\(\s*["']stock_movements["']\s*\)/);
    assert.doesNotMatch(queries, /\.update\(/);
    assert.doesNotMatch(queries, /\.insert\(/);
    // Summary aggregation uses a read-only INVOKER RPC; writes stay on adjust_inventory.
    assert.match(queries, /rpc\(\s*["']get_inventory_summary_data["']\s*\)/);
    assert.doesNotMatch(queries, /rpc\(\s*["']adjust_inventory["']\s*\)/);
  });

  it("ZERO stock filter matches active products with zero or missing inventory", () => {
    const queries = readSrc("src/lib/inventory/queries.ts");
    assert.match(queries, /stock === ["']ZERO["']/);
    assert.match(queries, /\.eq\(\s*["']is_active["']\s*,\s*true\s*\)/);
    assert.match(
      queries,
      /quantity_on_hand\.eq\.0,id\.is\.null[\s\S]*foreignTable:\s*["']inventory["']/,
    );
  });
});
