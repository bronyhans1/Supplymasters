import type { AppRole } from "@/lib/auth/roles";
import { formatGhs } from "@/lib/supplies/money";
import { formatReportQuantity } from "@/lib/reports/presentation";

/** Subset of dashboard summary fields needed for presentation-only cards. */
export type DashboardMetricSource = {
  suppliesTodayCount: number;
  suppliesTodayValue: number;
  paymentsTodayAmount: number;
  paymentsTodayCount: number;
  openDeliveriesCount: number;
  zeroStockCount: number;
  purchasesThisMonthCount: number;
  purchasesThisMonthCost: number;
  returnsThisMonthCount: number;
};

export type DashboardMetricCard = {
  label: string;
  primary: string;
  secondary: string;
  /** When omitted, the card is display-only (no drill-down). */
  href?: string;
};

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/**
 * Role-aware drill-down destinations for dashboard cards.
 * Metric values are unchanged — only navigation targets differ.
 * STAFF never receives ADMIN-only report/purchasing destinations.
 */
export function dashboardMetricHrefs(role: AppRole): {
  supplies: string;
  payments: string;
  openDeliveries: string;
  zeroStock: string;
  purchases: string | undefined;
  returns: string;
} {
  const openDeliveries = "/app/deliveries?status=OPEN";
  const zeroStock = "/app/inventory?stock=ZERO";

  if (role === "ADMIN") {
    return {
      supplies: "/app/reports?period=today&section=supplies",
      payments: "/app/reports?period=today&section=payments",
      openDeliveries,
      zeroStock,
      purchases: "/app/reports?period=this_month&section=purchasing",
      returns: "/app/reports?period=this_month&section=returns",
    };
  }

  // STAFF / DRIVER: operational lists only. Purchases have no STAFF list page.
  return {
    supplies: "/app/supplies",
    payments: "/app/payments",
    openDeliveries,
    zeroStock,
    purchases: undefined,
    returns: "/app/returns",
  };
}

/** Presentation-only dashboard cards; does not change metric calculations. */
export function buildDashboardMetricCards(
  summary: DashboardMetricSource,
  role: AppRole = "ADMIN",
): DashboardMetricCard[] {
  const hrefs = dashboardMetricHrefs(role);

  return [
    {
      label: "Supplies today",
      primary: formatGhs(summary.suppliesTodayValue),
      secondary: `${formatReportQuantity(summary.suppliesTodayCount)} ${pluralize(summary.suppliesTodayCount, "supply", "supplies")} recorded today`,
      href: hrefs.supplies,
    },
    {
      label: "Payments collected today",
      primary: formatGhs(summary.paymentsTodayAmount),
      secondary: `${formatReportQuantity(summary.paymentsTodayCount)} ${pluralize(summary.paymentsTodayCount, "payment", "payments")} recorded today`,
      href: hrefs.payments,
    },
    {
      label: "Open deliveries",
      primary: formatReportQuantity(summary.openDeliveriesCount),
      secondary: "Pending and dispatched deliveries",
      href: hrefs.openDeliveries,
    },
    {
      label: "Zero-stock products",
      primary: formatReportQuantity(summary.zeroStockCount),
      secondary: "Active products with zero on-hand stock",
      href: hrefs.zeroStock,
    },
    {
      label: "Purchases this month",
      primary: formatGhs(summary.purchasesThisMonthCost),
      secondary: `${formatReportQuantity(summary.purchasesThisMonthCount)} stock ${pluralize(summary.purchasesThisMonthCount, "purchase", "purchases")} recorded this month`,
      href: hrefs.purchases,
    },
    {
      label: "Returns this month",
      primary: formatReportQuantity(summary.returnsThisMonthCount),
      secondary: "Stock returns recorded this month — not cash refunds",
      href: hrefs.returns,
    },
  ];
}
