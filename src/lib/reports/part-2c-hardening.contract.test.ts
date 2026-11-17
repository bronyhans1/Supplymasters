import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { REPORTS_PAGE_SIZE } from "./schemas";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("Phase J Part 2C hardening contracts", () => {
  it("Reports Center aggregates and paginates in the database RPC", () => {
    const sql = read(
      "supabase/migrations/20261112000100_reports_center_db_aggregation.sql",
    );
    const queries = read("src/lib/reports/queries.ts");

    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_reports_center_data/);
    assert.match(sql, /SECURITY INVOKER/);
    assert.match(sql, /REPORTS_FORBIDDEN/);
    assert.match(sql, /Africa\/Accra/);
    assert.match(sql, /LEAST\(GREATEST\(COALESCE\(p_page_size/);
    assert.match(sql, /OFFSET v_offset/);
    assert.match(sql, /LIMIT v_page_size/);
    assert.match(sql, /jsonb_build_object/);

    assert.match(queries, /rpc\("get_reports_center_data"/);
    assert.match(queries, /mapReportsRpc/);
    // Historical comments may mention the old Node aggregators; live path must not call them.
    assert.doesNotMatch(queries, /\bpageSlice\s*\(/);
    assert.doesNotMatch(queries, /\bsumMoneyAcrossPages\s*\(/);
    assert.equal(REPORTS_PAGE_SIZE, 20);
    assert.ok(
      REPORTS_PAGE_SIZE <= 100,
      "client page size must stay within SQL clamp max 100",
    );
  });

  it("Dashboard Alternative A keeps INVOKER summary + narrow DEFINER purchase helper", () => {
    const sql = read(
      "supabase/migrations/20261113000100_dashboard_summary_db_aggregation.sql",
    );
    const queries = read("src/lib/reports/queries.ts");

    assert.match(sql, /get_dashboard_summary_data[\s\S]*SECURITY INVOKER/);
    assert.match(
      sql,
      /get_dashboard_purchase_aggregates[\s\S]*SECURITY DEFINER/,
    );
    assert.match(sql, /SET search_path = pg_catalog, pg_temp/);
    assert.match(sql, /OWNER TO postgres/);
    assert.match(sql, /Africa\/Accra/);
    assert.match(sql, /DASHBOARD_FORBIDDEN/);
    assert.match(sql, /get_dashboard_purchase_aggregates\(\)/);
    assert.doesNotMatch(sql, /GRANT SELECT ON TABLE public\.stock_purchases TO/);

    assert.match(queries, /rpc\("get_dashboard_summary_data"\)/);
    assert.doesNotMatch(queries, /\bsumMoneyAcrossPages\s*\(/);
  });

  it("password-change post-check uses fresh profile after Part 2B cache", () => {
    const session = read("src/lib/auth/session.ts");
    const actions = read("src/lib/auth/actions.ts");
    assert.match(session, /export const getCurrentProfile = cache\(/);
    assert.match(session, /export async function getCurrentProfileFresh/);
    const changeAction = actions.slice(actions.indexOf("changePasswordAction"));
    assert.match(changeAction, /getCurrentProfileFresh\(/);
    assert.doesNotMatch(changeAction, /await getCurrentProfile\(/);
  });

  it("documents measured vs estimated performance evidence sources", () => {
    /**
     * Measured (live catalog via read-only SQL, 2026-11-12):
     * - get_reports_center_data: INVOKER, Accra bounds, page_size clamp, OFFSET present
     * - get_dashboard_summary_data: INVOKER, search_path=pg_catalog,pg_temp, owner postgres
     * - get_dashboard_purchase_aggregates: DEFINER, search_path=pg_catalog,pg_temp, owner postgres
     * - stock_purchases: RLS on, FORCE RLS off, authenticated has no SELECT
     * - EXPLAIN ANALYZE of dashboard RPC: not measured (MCP role lacks EXECUTE as authenticated)
     *
     * Call-graph estimates only (not wall-clock):
     * - Reports page after Part 2B: 1 claims + 1 profile (cached) + 1 reports RPC + 3 filter lists (≤200) + selected product resolve
     * - Staff dashboard after Part 2B: 1 claims + 1 profile + 1 dashboard RPC
     * - Auth lookups eliminated vs Part 2A: ~4 claims + ~2 profiles per staff dashboard request
     */
    const queries = read("src/lib/reports/queries.ts");
    assert.match(queries, /1 RPC/);
    assert.match(queries, /\.limit\(200\)/);
  });
});
