import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireStaffOrAdmin } from "@/lib/auth/session";
import { AppError } from "@/lib/utils/errors";
import { canAccessReports } from "./authorization";
import {
  parseReportsQuery,
  REPORTS_PAGE_SIZE,
  type ReportsQuery,
} from "./schemas";
import { resolveReportPeriod } from "./presentation";
import {
  mapDashboardRpc,
  type DashboardRpcPayload,
} from "./dashboard-rpc-types";
import {
  mapReportsRpc,
  type ReportsCenterMappedPayload,
} from "./map-rpc";
import type { ReportsRpcPayload } from "./rpc-types";
import {
  resolveProductFilterOption,
  type ProductFilterOption,
} from "@/lib/products/options";

async function assertCanAccessReports() {
  const { profile } = await requireStaffOrAdmin();
  if (!canAccessReports(profile)) {
    throw new AppError(
      403,
      "REPORTS_FORBIDDEN",
      "You do not have permission to view management reports.",
    );
  }
  return profile;
}

export type ReportsCenterData = ReportsCenterMappedPayload & {
  query: ReportsQuery;
  period: ReturnType<typeof resolveReportPeriod>;
  filterOptions: {
    vendors: Array<{ id: string; label: string }>;
    /** Selected product only — options load via searchable typeahead. */
    selectedProduct: ProductFilterOption | null;
    suppliers: Array<{ id: string; label: string }>;
    staff: Array<{ id: string; label: string }>;
  };
};

export { mapReportsRpc } from "./map-rpc";

/**
 * Reports Center data via DB aggregation RPC.
 *
 * Before (unbounded PostgREST reads + Node aggregation):
 *   ~14+ queries, full period row sets (capped silently at ~1000), pageSlice in memory.
 * After (requires migration 20261112000100 applied):
 *   1 RPC for aggregates + paginated histories + 3 capped filter lists + selected product resolve.
 */
export async function getReportsCenterData(
  rawQuery: Partial<Record<string, string | string[] | undefined>> = {},
): Promise<ReportsCenterData> {
  await assertCanAccessReports();
  const parsed = parseReportsQuery(rawQuery);
  const period = resolveReportPeriod(
    parsed.period,
    parsed.fromDate,
    parsed.toDate,
  );
  const supabase = await createClient();

  const [rpcResult, vendorOptions, selectedProduct, supplierOptions, staffOptions] =
    await Promise.all([
      supabase.rpc("get_reports_center_data", {
        p_from_date: period.fromDate,
        p_to_date: period.toDate,
        p_vendor_id: parsed.vendorId || null,
        p_product_id: parsed.productId || null,
        p_supplier_id: parsed.supplierId || null,
        p_payment_method: parsed.paymentMethod || null,
        p_delivery_status: parsed.deliveryStatus || null,
        p_staff_id: parsed.staffId || null,
        p_page: parsed.page,
        p_page_size: REPORTS_PAGE_SIZE,
      }),
      supabase
        .from("vendors")
        .select("id, business_name")
        .order("business_name")
        .limit(200),
      parsed.productId
        ? resolveProductFilterOption(parsed.productId)
        : Promise.resolve(null),
      supabase
        .from("stock_suppliers")
        .select("id, name")
        .order("name")
        .limit(200),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["ADMIN", "STAFF"])
        .eq("is_active", true)
        .order("full_name")
        .limit(200),
    ]);

  if (rpcResult.error) {
    const message = rpcResult.error.message ?? "";
    if (message.includes("REPORTS_FORBIDDEN")) {
      throw new AppError(
        403,
        "REPORTS_FORBIDDEN",
        "You do not have permission to view management reports.",
      );
    }
    if (
      message.includes("Could not find the function") ||
      message.includes("schema cache") ||
      rpcResult.error.code === "PGRST202"
    ) {
      throw new AppError(
        503,
        "REPORTS_MIGRATION_REQUIRED",
        "Reports Center requires database migration 20261112000100_reports_center_db_aggregation. Apply it before using reports.",
      );
    }
    throw new AppError(
      500,
      "REPORTS_QUERY_FAILED",
      "Unable to load report data for the selected period.",
    );
  }

  if (vendorOptions.error || supplierOptions.error || staffOptions.error) {
    throw new AppError(
      500,
      "REPORTS_QUERY_FAILED",
      "Unable to load report filter options.",
    );
  }

  if (!rpcResult.data || typeof rpcResult.data !== "object") {
    throw new AppError(
      500,
      "REPORTS_QUERY_FAILED",
      "Reports Center returned an empty payload.",
    );
  }

  const mapped = mapReportsRpc(rpcResult.data as ReportsRpcPayload);

  return {
    query: parsed,
    period,
    ...mapped,
    filterOptions: {
      vendors: (vendorOptions.data ?? []).map((row) => ({
        id: row.id,
        label: row.business_name,
      })),
      selectedProduct,
      suppliers: (supplierOptions.data ?? []).map((row) => ({
        id: row.id,
        label: row.name,
      })),
      staff: (staffOptions.data ?? []).map((row) => ({
        id: row.id,
        label: row.full_name,
      })),
    },
  };
}

export type DashboardSummary = {
  suppliesTodayCount: number;
  suppliesTodayValue: number;
  paymentsTodayAmount: number;
  paymentsTodayCount: number;
  openDeliveriesCount: number;
  zeroStockCount: number;
  purchasesThisMonthCount: number;
  purchasesThisMonthCost: number;
  returnsThisMonthCount: number;
  periodLabels: {
    today: string;
    thisMonth: string;
  };
};

/**
 * Operational home metrics for STAFF and ADMIN (not Reports Center).
 *
 * Before: ~10+ PostgREST calls + sumMoneyAcrossPages row transfers.
 * After (requires migration 20261113000100): 1 RPC.
 * Purchase count/cost come from a narrow SECURITY DEFINER helper called
 * inside the INVOKER RPC — STAFF still cannot SELECT stock_purchases rows.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  await requireStaffOrAdmin();
  const supabase = await createClient();
  const today = resolveReportPeriod("today");
  const thisMonth = resolveReportPeriod("this_month");

  const { data, error } = await supabase.rpc("get_dashboard_summary_data");

  if (error) {
    const message = error.message ?? "";
    if (message.includes("DASHBOARD_FORBIDDEN")) {
      throw new AppError(
        403,
        "DASHBOARD_FORBIDDEN",
        "You do not have permission to view dashboard metrics.",
      );
    }
    if (
      message.includes("Could not find the function") ||
      message.includes("schema cache") ||
      error.code === "PGRST202"
    ) {
      throw new AppError(
        503,
        "DASHBOARD_MIGRATION_REQUIRED",
        "Dashboard metrics require database migration 20261113000100_dashboard_summary_db_aggregation. Apply it before using the dashboard.",
      );
    }
    throw new AppError(
      500,
      "DASHBOARD_SUMMARY_FAILED",
      "Unable to load dashboard summary metrics.",
    );
  }

  if (!data || typeof data !== "object") {
    throw new AppError(
      500,
      "DASHBOARD_SUMMARY_FAILED",
      "Dashboard summary returned an empty payload.",
    );
  }

  const mapped = mapDashboardRpc(data as DashboardRpcPayload);

  return {
    ...mapped,
    periodLabels: {
      today: today.label,
      thisMonth: thisMonth.label,
    },
  };
}
