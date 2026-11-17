import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const migration =
  "supabase/migrations/20261114000100_inventory_summary_db_aggregation.sql";
const verify = "supabase/tests/j_inventory_summary_aggregation_verify.sql";

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("inventory summary DB aggregation migration contract", () => {
  it("ships INVOKER RPC with hardened search_path and STAFF/ADMIN gate", () => {
    const sql = read(migration);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_inventory_summary_data/);
    assert.match(sql, /SECURITY INVOKER/);
    assert.match(sql, /SET search_path = pg_catalog, pg_temp/);
    assert.match(sql, /OWNER TO postgres/);
    assert.match(sql, /INVENTORY_SUMMARY_FORBIDDEN/);
    assert.match(sql, /'STAFF'::public\.app_role/);
    assert.match(sql, /'ADMIN'::public\.app_role/);
    assert.match(sql, /must_change_password IS TRUE/);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_inventory_summary_data\(\) FROM anon/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_inventory_summary_data\(\) TO authenticated/);
    assert.doesNotMatch(sql, /SECURITY DEFINER/);
    assert.doesNotMatch(sql, /GRANT SELECT ON TABLE public\.inventory/);
    assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.adjust_inventory/);
  });

  it("preserves inventory-page summary semantics distinct from dashboard zero-stock", () => {
    const sql = read(migration);
    assert.match(sql, /productsWithZeroStock/);
    assert.match(sql, /productsMissingInventory/);
    assert.match(sql, /totalsByUnit/);
    assert.match(sql, /quantity_on_hand > 0/);
    assert.match(sql, /quantity_on_hand <= 0/);
    assert.match(sql, /Dashboard zero-stock metric is separate/);
    // Payload keys must not include dashboard's zeroStockCount field.
    assert.doesNotMatch(sql, /'zeroStockCount'/);
  });

  it("wires app summary to the RPC and keeps list/detail workflows on tables", () => {
    const queries = read("src/lib/inventory/queries.ts");
    assert.match(queries, /rpc\("get_inventory_summary_data"\)/);
    assert.match(queries, /mapInventorySummaryRpc/);
    assert.match(queries, /INVENTORY_SUMMARY_MIGRATION_REQUIRED/);
    assert.match(queries, /listInventory/);
    assert.match(queries, /listStockMovementsForProduct/);
    assert.match(queries, /\.from\("products"\)/);
    assert.match(queries, /\.from\("inventory"\)/);
    assert.match(queries, /\.from\("stock_movements"\)/);
    assert.doesNotMatch(queries, /sumMoneyAcrossPages\s*\(/);

    const dashboard = read(
      "supabase/migrations/20261113000100_dashboard_summary_db_aggregation.sql",
    );
    assert.match(dashboard, /zeroStockCount/);
  });

  it("includes a read-only verification script covering authz surface", () => {
    const sql = read(verify);
    assert.match(sql, /get_inventory_summary_data/);
    assert.match(sql, /search_path_setting/);
    assert.match(sql, /anon_execute/);
    assert.match(sql, /inventory_select_staff_admin/);
    assert.match(sql, /using_expr/);
    assert.match(sql, /with_check_expr/);
    assert.match(sql, /is_staff_or_admin\(\)/);
    assert.match(sql, /is_active_user\(\)/);
    assert.match(sql, /UNIQUE \(product_id\)/);
    assert.match(sql, /data_type = integer/);
    assert.match(sql, /uses_round = false/);
    assert.match(sql, /has_table_privilege/);
    assert.match(sql, /Table grants and RLS are separate layers/);
    assert.match(
      sql,
      /inventory authenticated_insert\/update\/delete may be true/,
    );
    assert.match(sql, /NOT REQUIRED: inventory authenticated_insert\/update = false/);
    assert.match(sql, /INVENTORY_SUMMARY_FORBIDDEN/);
    assert.match(sql, /Does not mutate data/);
  });
});
