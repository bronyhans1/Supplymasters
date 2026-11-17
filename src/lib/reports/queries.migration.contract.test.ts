import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mapReportsRpc } from "./map-rpc";
import type { ReportsRpcPayload } from "./rpc-types";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20261112000100_reports_center_db_aggregation.sql",
);
const verifyPath = join(
  process.cwd(),
  "supabase/tests/j_reports_center_aggregation_verify.sql",
);

describe("Phase J reports center migration contracts", () => {
  const sql = readFileSync(migrationPath, "utf8");
  const verify = readFileSync(verifyPath, "utf8");

  it("ships an ADMIN-gated SECURITY INVOKER aggregation RPC", () => {
    assert.match(sql, /^BEGIN;/m);
    assert.match(sql, /^COMMIT;/m);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_reports_center_data/);
    assert.match(sql, /SECURITY INVOKER/);
    assert.match(sql, /SET search_path = public/);
    assert.match(sql, /must_change_password IS TRUE/);
    assert.match(sql, /role IS DISTINCT FROM 'ADMIN'/);
    assert.match(sql, /REPORTS_FORBIDDEN/);
    assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_reports_center_data/);
    assert.match(sql, /FROM anon/);
    assert.match(sql, /GRANT EXECUTE[\s\S]*TO authenticated/);
    assert.match(sql, /Do not apply automatically/);
  });

  it("aggregates money spines separately and paginates histories in SQL", () => {
    assert.match(sql, /SUM\(grand_total\)/);
    assert.match(sql, /SUM\(amount\)/);
    assert.match(sql, /SUM\(pb\.total_cost\)|SUM\(sp\.total_cost\)|SUM\(total_cost\)/);
    assert.match(sql, /OFFSET v_offset/);
    assert.match(sql, /LIMIT v_page_size/);
    assert.match(sql, /Africa\/Accra/);
    assert.doesNotMatch(sql, /sum\(.*grand_total.*\+.*amount/i);
    assert.match(sql, /movement_type = 'DELIVERY_RETURN'/);
    assert.match(sql, /delivery_stock_return_items/);
  });

  it("documents Accra bounds helper and verify script", () => {
    assert.match(sql, /reports_accra_day_bounds/);
    assert.match(verify, /reports_accra_day_bounds/);
    assert.match(verify, /anon_execute/);
    assert.match(verify, /Read-only/);
  });

  it("maps empty RPC payload without inventing money", () => {
    const empty: ReportsRpcPayload = {
      page: 1,
      pageSize: 20,
      fromDate: "2026-01-01",
      toDate: "2026-01-01",
      supplies: {
        supplyCount: 0,
        totalSupplyValue: 0,
        totalQuantitySupplied: 0,
        byDate: [],
        byVendor: [],
        byProduct: [],
        history: [],
        historyTotal: 0,
      },
      payments: {
        cashCollected: { count: 0, totalAmount: 0, byMethod: [] },
        byDate: [],
        byVendor: [],
        historyPage: [],
        historyTotal: 0,
        reconciliation: {
          matchedCount: 0,
          mismatchedCount: 0,
          missingSupplyCount: 0,
          mismatches: [],
        },
      },
      purchasing: {
        purchaseCount: 0,
        totalPurchaseCost: 0,
        totalQuantityPurchased: 0,
        bySupplier: [],
        byDate: [],
        history: [],
        historyTotal: 0,
      },
      deliveries: {
        counts: {
          PENDING: 0,
          DISPATCHED: 0,
          DELIVERED: 0,
          FAILED: 0,
          CANCELLED: 0,
          OTHER: 0,
        },
        total: 0,
        history: [],
        historyTotal: 0,
      },
      returns: {
        returnCount: 0,
        returnedQuantity: 0,
        inventoryRestoredQuantity: 0,
        byDate: [],
        byProduct: [],
        byDelivery: [],
        note: "Returned quantities come from return items.",
      },
      inventory: {
        productCount: 0,
        inventoryRowCount: 0,
        totalOnHand: 0,
        zeroStockCount: 0,
        zeroStock: [],
        adjustments: [],
        movements: [],
      },
      vendors: {
        vendorCount: 0,
        supplyCount: 0,
        totalSupplyValue: 0,
        totalQuantity: 0,
        totalCashCollected: 0,
        byVendor: [],
        history: [],
        historyTotal: 0,
      },
    };

    const mapped = mapReportsRpc(empty);
    assert.equal(mapped.supplies.totalSupplyValue, 0);
    assert.equal(mapped.payments.cashCollected.totalAmount, 0);
    assert.equal(mapped.purchasing.totalPurchaseCost, 0);
    assert.equal(mapped.vendors.totalCashCollected, 0);
    assert.equal(mapped.supplies.historyTotal, 0);
    assert.equal(mapped.payments.historyPage.length, 0);
  });

  it("maps numeric strings from PostgREST without float invention", () => {
    const payload = {
      page: 2,
      pageSize: 20,
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
      supplies: {
        supplyCount: 2,
        totalSupplyValue: "150.50",
        totalQuantitySupplied: "6",
        byDate: [],
        byVendor: [],
        byProduct: [],
        history: [
          {
            id: "s1",
            supply_date: "2026-03-02",
            grand_total: "100.00",
            vendor_id: "v1",
            vendor_name: "Vendor A",
          },
        ],
        historyTotal: 2,
      },
      payments: {
        cashCollected: {
          count: 1,
          totalAmount: "100.00",
          byMethod: [{ method: "CASH" as const, count: 1, amount: "100.00" }],
        },
        byDate: [],
        byVendor: [],
        historyPage: [],
        historyTotal: 1,
        reconciliation: {
          matchedCount: 1,
          mismatchedCount: 0,
          missingSupplyCount: 0,
          mismatches: [],
        },
      },
      purchasing: {
        purchaseCount: 0,
        totalPurchaseCost: "0",
        totalQuantityPurchased: "0",
        bySupplier: [],
        byDate: [],
        history: [],
        historyTotal: 0,
      },
      deliveries: {
        counts: {
          PENDING: 0,
          DISPATCHED: 0,
          DELIVERED: 0,
          FAILED: 0,
          CANCELLED: 0,
          OTHER: 0,
        },
        total: 0,
        history: [],
        historyTotal: 0,
      },
      returns: {
        returnCount: 0,
        returnedQuantity: "0",
        inventoryRestoredQuantity: "0",
        byDate: [],
        byProduct: [],
        byDelivery: [],
        note: "note",
      },
      inventory: {
        productCount: 1,
        inventoryRowCount: 1,
        totalOnHand: "0",
        zeroStockCount: 1,
        zeroStock: [],
        adjustments: [],
        movements: [],
      },
      vendors: {
        vendorCount: 1,
        supplyCount: 2,
        totalSupplyValue: "150.50",
        totalQuantity: "6",
        totalCashCollected: "100.00",
        byVendor: [],
        history: [],
        historyTotal: 2,
      },
    } satisfies ReportsRpcPayload;

    const mapped = mapReportsRpc(payload);
    assert.equal(mapped.supplies.totalSupplyValue, 150.5);
    assert.equal(mapped.payments.cashCollected.totalAmount, 100);
    assert.equal(mapped.supplies.history[0]?.grand_total, 100);
    assert.equal(mapped.supplies.historyTotal, 2);
    assert.notEqual(
      mapped.supplies.totalSupplyValue,
      mapped.payments.cashCollected.totalAmount,
    );
  });

  it("documents >1000 row correctness via SQL SUM without row LIMIT on aggregates", () => {
    assert.match(sql, /supplies_summary AS/);
    assert.doesNotMatch(
      sql,
      /supplies_summary AS \([\s\S]*?LIMIT\s+1000/,
    );
    assert.match(sql, /payments_summary AS/);
    assert.match(
      readFileSync(join(process.cwd(), "src/lib/reports/queries.ts"), "utf8"),
      /1 RPC for aggregates \+ paginated histories/,
    );
  });

  it("preserves product-filter returnCount quirk and Accra timestamp bounds", () => {
    assert.match(
      sql,
      /\(SELECT COUNT\(\*\)::integer FROM return_headers\) AS return_count/,
    );
    assert.match(sql, /p_product_id IS NULL OR ri\.product_id = p_product_id/);
    assert.match(sql, /movement_type = 'DELIVERY_RETURN'/);
    assert.match(sql, /AS inventory_restored_quantity/);
    assert.match(sql, /created_at >= v_from_ts/);
    assert.match(sql, /created_at < v_to_ts_exclusive/);
    assert.doesNotMatch(sql, /T00:00:00\.000Z/);
  });

  it("paginates histories with stable ORDER BY before OFFSET/LIMIT", () => {
    assert.match(
      sql,
      /ORDER BY sb\.supply_date DESC, sb\.id DESC\s+OFFSET v_offset\s+LIMIT v_page_size/,
    );
    assert.match(
      sql,
      /ORDER BY payment_date DESC, id DESC\s+OFFSET v_offset\s+LIMIT v_page_size/,
    );
    assert.match(
      sql,
      /ORDER BY pb\.purchase_date DESC, pb\.id DESC\s+OFFSET v_offset\s+LIMIT v_page_size/,
    );
    assert.match(
      sql,
      /ORDER BY delivery_date DESC, id DESC\s+OFFSET v_offset\s+LIMIT v_page_size/,
    );
    assert.match(
      sql,
      /ORDER BY supply_date DESC, supply_id DESC\s+OFFSET v_offset\s+LIMIT v_page_size/,
    );
    assert.match(sql, /jsonb_agg\(to_jsonb\(t\) ORDER BY/);
  });

  it("keeps vendor cash and supply totals on separate spines", () => {
    assert.match(sql, /ROUND\(SUM\(grand_total\), 2\), 0\)::numeric AS total_supply_value/);
    assert.match(
      sql,
      /ROUND\(SUM\(payment_amount\), 2\), 0\)::numeric AS total_cash_collected/,
    );
    assert.match(sql, /LEFT JOIN payment_base pay ON pay\.supply_id = sb\.id/);
    assert.doesNotMatch(
      sql,
      /vendor_history_base AS \([\s\S]*LEFT JOIN public\.payments pay/,
    );
  });
});

describe("Phase J reports Accra period contracts (application layer)", () => {
  it("resolves custom Accra calendar ranges without UTC day shift in helpers", async () => {
    const { resolveReportPeriod } = await import("./presentation");
    // Midnight UTC is still the same Ghana calendar day (Accra = UTC+0, no DST).
    const nearMidnight = new Date("2026-06-01T00:30:00.000Z");
    const today = resolveReportPeriod("today", "", "", nearMidnight);
    assert.equal(today.fromDate, "2026-06-01");
    assert.equal(today.toDate, "2026-06-01");

    const custom = resolveReportPeriod(
      "custom",
      "2026-05-31",
      "2026-06-01",
      nearMidnight,
    );
    assert.equal(custom.fromDate, "2026-05-31");
    assert.equal(custom.toDate, "2026-06-01");
  });
});

