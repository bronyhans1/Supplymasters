/** Wire shape from public.get_dashboard_summary_data (numerics may be strings). */
export type DashboardRpcPayload = {
  suppliesTodayCount: number | string;
  suppliesTodayValue: number | string;
  paymentsTodayCount: number | string;
  paymentsTodayAmount: number | string;
  openDeliveriesCount: number | string;
  zeroStockCount: number | string;
  purchasesThisMonthCount: number | string;
  purchasesThisMonthCost: number | string;
  returnsThisMonthCount: number | string;
  today?: string;
  thisMonthFrom?: string;
  thisMonthTo?: string;
};

/** Wire shape from public.get_dashboard_purchase_aggregates — scalars only. */
export type DashboardPurchaseAggregatePayload = {
  purchaseCount: number | string;
  totalPurchaseCost: number | string;
};

export function asDashboardNumber(
  value: number | string | null | undefined,
): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapDashboardRpc(payload: DashboardRpcPayload): {
  suppliesTodayCount: number;
  suppliesTodayValue: number;
  paymentsTodayAmount: number;
  paymentsTodayCount: number;
  openDeliveriesCount: number;
  zeroStockCount: number;
  purchasesThisMonthCount: number;
  purchasesThisMonthCost: number;
  returnsThisMonthCount: number;
} {
  return {
    suppliesTodayCount: asDashboardNumber(payload.suppliesTodayCount),
    suppliesTodayValue: asDashboardNumber(payload.suppliesTodayValue),
    paymentsTodayAmount: asDashboardNumber(payload.paymentsTodayAmount),
    paymentsTodayCount: asDashboardNumber(payload.paymentsTodayCount),
    openDeliveriesCount: asDashboardNumber(payload.openDeliveriesCount),
    zeroStockCount: asDashboardNumber(payload.zeroStockCount),
    purchasesThisMonthCount: asDashboardNumber(payload.purchasesThisMonthCount),
    purchasesThisMonthCost: asDashboardNumber(payload.purchasesThisMonthCost),
    returnsThisMonthCount: asDashboardNumber(payload.returnsThisMonthCount),
  };
}

/** Ensures purchase helper JSON exposes only the two approved aggregate keys. */
export function assertPurchaseAggregateShape(
  payload: Record<string, unknown>,
): asserts payload is DashboardPurchaseAggregatePayload {
  const keys = Object.keys(payload).sort();
  const expected = ["purchaseCount", "totalPurchaseCost"];
  if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
    throw new Error(
      `Unexpected purchase aggregate keys: ${keys.join(", ") || "(none)"}`,
    );
  }
}
