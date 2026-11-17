import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertPurchaseAggregateShape,
  asDashboardNumber,
  mapDashboardRpc,
} from "./dashboard-rpc-types";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261113000100_dashboard_summary_db_aggregation.sql",
);
const verifyPath = join(
  process.cwd(),
  "supabase/tests/j_dashboard_summary_aggregation_verify.sql",
);
const queriesPath = join(process.cwd(), "src/lib/reports/queries.ts");
const reportsMigrationPath = join(
  process.cwd(),
  "supabase/migrations/20261112000100_reports_center_db_aggregation.sql",
);

describe("Phase J Part 2A dashboard migration contracts", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const verify = readFileSync(verifyPath, "utf8");
  const queries = readFileSync(queriesPath, "utf8");
  const reportsSql = readFileSync(reportsMigrationPath, "utf8");

  it("ships INVOKER summary RPC and narrow DEFINER purchase helper", () => {
    assert.match(sql, /^BEGIN;/m);
    assert.match(sql, /^COMMIT;/m);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_dashboard_summary_data/);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_dashboard_purchase_aggregates/);
    assert.match(
      sql,
      /FUNCTION public\.get_dashboard_purchase_aggregates\(\)[\s\S]*?SECURITY DEFINER/,
    );
    assert.match(
      sql,
      /FUNCTION public\.get_dashboard_summary_data\(\)[\s\S]*?SECURITY INVOKER/,
    );
    assert.match(
      sql,
      /FUNCTION public\.get_dashboard_purchase_aggregates\(\)[\s\S]*?SET search_path = pg_catalog, pg_temp/,
    );
    assert.match(
      sql,
      /FUNCTION public\.get_dashboard_summary_data\(\)[\s\S]*?SET search_path = pg_catalog, pg_temp/,
    );
    assert.doesNotMatch(
      sql,
      /get_dashboard_(?:purchase_aggregates|summary_data)\(\)[\s\S]*?SET search_path = public\b/,
    );
    assert.match(
      sql,
      /ALTER FUNCTION public\.get_dashboard_purchase_aggregates\(\) OWNER TO postgres/,
    );
    assert.match(sql, /auth\.uid\(\)/);
    assert.match(sql, /statement_timestamp\(\)/);
    assert.doesNotMatch(sql, /clock_timestamp\(\)/);
    assert.match(sql, /must_change_password IS TRUE/);
    assert.match(sql, /DASHBOARD_FORBIDDEN/);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_dashboard_purchase_aggregates/);
    assert.match(sql, /FROM anon/);
    assert.match(sql, /GRANT EXECUTE[\s\S]*get_dashboard_purchase_aggregates[\s\S]*TO authenticated/);
    assert.match(sql, /Do not apply automatically/);
    assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  });

  it("keeps purchase helper scalar-only and does not weaken purchase RLS", () => {
    assert.match(sql, /jsonb_build_object\(\s*'purchaseCount'/);
    assert.match(sql, /'totalPurchaseCost'/);
    assert.doesNotMatch(sql, /purchase_ref/);
    assert.doesNotMatch(sql, /supplier_id/);
    assert.doesNotMatch(sql, /stock_purchase_items/);
    assert.doesNotMatch(sql, /GRANT SELECT ON TABLE public\.stock_purchases/);
    assert.doesNotMatch(sql, /DROP POLICY.*stock_purchases_select_admin/);
    assert.doesNotMatch(sql, /CREATE POLICY stock_purchases_select/);
    assert.match(sql, /SUM\(sp\.total_cost\)/);
    assert.match(sql, /purchase_date >= v_month_start/);
    assert.match(sql, /purchase_date <= v_today/);
  });

  it("aggregates dashboard money spines separately with Accra bounds", () => {
    assert.match(sql, /SUM\(s\.grand_total\)/);
    assert.match(sql, /SUM\(pay\.amount\)/);
    assert.match(sql, /Africa\/Accra/);
    assert.match(sql, /PENDING'::public\.delivery_status/);
    assert.match(sql, /DISPATCHED'::public\.delivery_status/);
    assert.match(sql, /quantity_on_hand > 0/);
    assert.match(sql, /created_at >= v_returns_from/);
    assert.match(sql, /created_at < v_returns_to_exclusive/);
    assert.doesNotMatch(sql, /grand_total.*\+.*amount|amount.*\+.*total_cost/i);
    assert.match(sql, /public\.get_dashboard_purchase_aggregates\(\)/);
  });

  it("wires getDashboardSummary to the RPC and leaves Reports migration untouched", () => {
    assert.match(queries, /rpc\("get_dashboard_summary_data"\)/);
    assert.doesNotMatch(queries, /sumMoneyAcrossPages\s*\(/);
    assert.doesNotMatch(
      queries,
      /from\("stock_purchases"\)[\s\S]*getDashboardSummary|getDashboardSummary[\s\S]*from\("stock_purchases"\)/,
    );
    assert.match(queries, /DASHBOARD_MIGRATION_REQUIRED/);
    assert.match(reportsSql, /get_reports_center_data/);
    assert.doesNotMatch(reportsSql, /get_dashboard_summary_data/);
    assert.match(verify, /stock_purchases_select_admin|is_admin/);
    assert.match(verify, /owner_bypassrls/);
    assert.match(verify, /relforcerowsecurity|rls_forced/);
    assert.match(verify, /helper_owner_has_select_on_stock_purchases/);
    assert.match(verify, /anon_create_on_public/);
    assert.match(verify, /search_path_setting/);
    assert.match(verify, /anon_execute/);
  });

  it("maps empty and numeric-string RPC payloads to zeros/finite numbers", () => {
    const mapped = mapDashboardRpc({
      suppliesTodayCount: 0,
      suppliesTodayValue: "0",
      paymentsTodayCount: 0,
      paymentsTodayAmount: "0.00",
      openDeliveriesCount: 0,
      zeroStockCount: 0,
      purchasesThisMonthCount: "0",
      purchasesThisMonthCost: "0",
      returnsThisMonthCount: 0,
    });
    assert.equal(mapped.suppliesTodayValue, 0);
    assert.equal(mapped.paymentsTodayAmount, 0);
    assert.equal(mapped.purchasesThisMonthCost, 0);
    assert.equal(mapped.zeroStockCount, 0);

    const known = mapDashboardRpc({
      suppliesTodayCount: 2,
      suppliesTodayValue: "150.50",
      paymentsTodayCount: 1,
      paymentsTodayAmount: "100.00",
      openDeliveriesCount: 3,
      zeroStockCount: 4,
      purchasesThisMonthCount: "5",
      purchasesThisMonthCost: "999.99",
      returnsThisMonthCount: 1,
    });
    assert.equal(known.suppliesTodayValue, 150.5);
    assert.equal(known.purchasesThisMonthCount, 5);
    assert.equal(known.purchasesThisMonthCost, 999.99);
    assert.notEqual(known.suppliesTodayValue, known.paymentsTodayAmount);
    assert.equal(asDashboardNumber(null), 0);
    assert.equal(asDashboardNumber("bad"), 0);
  });

  it("rejects purchase helper payloads that leak extra keys", () => {
    assert.doesNotThrow(() =>
      assertPurchaseAggregateShape({
        purchaseCount: 1,
        totalPurchaseCost: "10.00",
      }),
    );
    assert.throws(() =>
      assertPurchaseAggregateShape({
        purchaseCount: 1,
        totalPurchaseCost: "10.00",
        purchase_ref: "NM-PUR-000001",
      }),
    );
    assert.throws(() =>
      assertPurchaseAggregateShape({
        purchaseCount: 1,
        totalPurchaseCost: "10.00",
        rows: [{ id: "x" }],
      }),
    );
  });

  it("documents Accra this-month = month start through today (not month end)", () => {
    assert.match(sql, /date_trunc\('month', v_today::timestamp\)::date/);
    assert.match(sql, /purchase_date <= v_today/);
    assert.doesNotMatch(
      sql,
      /purchase_date <= .*end.*month|purchase_date < \(v_month_start \+ interval/i,
    );
  });
});
