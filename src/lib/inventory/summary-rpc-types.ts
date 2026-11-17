export type InventoryUomTotal = {
  unit_of_measure: string;
  quantity_on_hand: number;
  product_count: number;
};

export type InventorySummary = {
  productCount: number;
  inventoryRecordCount: number;
  productsWithStock: number;
  productsWithZeroStock: number;
  productsMissingInventory: number;
  totalsByUnit: InventoryUomTotal[];
};

/** Wire shape from public.get_inventory_summary_data (numerics may be strings). */
export type InventorySummaryRpcPayload = {
  productCount: number | string;
  inventoryRecordCount: number | string;
  productsWithStock: number | string;
  productsWithZeroStock: number | string;
  productsMissingInventory: number | string;
  totalsByUnit: Array<{
    unit_of_measure: string;
    quantity_on_hand: number | string;
    product_count: number | string;
  }> | null;
};

export function asInventorySummaryNumber(
  value: number | string | null | undefined,
): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function mapInventorySummaryRpc(
  payload: InventorySummaryRpcPayload,
): InventorySummary {
  const totalsByUnit: InventoryUomTotal[] = (payload.totalsByUnit ?? []).map(
    (row) => ({
      unit_of_measure: row.unit_of_measure?.trim() || "Unspecified",
      quantity_on_hand: asInventorySummaryNumber(row.quantity_on_hand),
      product_count: asInventorySummaryNumber(row.product_count),
    }),
  );

  return {
    productCount: asInventorySummaryNumber(payload.productCount),
    inventoryRecordCount: asInventorySummaryNumber(payload.inventoryRecordCount),
    productsWithStock: asInventorySummaryNumber(payload.productsWithStock),
    productsWithZeroStock: asInventorySummaryNumber(payload.productsWithZeroStock),
    productsMissingInventory: asInventorySummaryNumber(
      payload.productsMissingInventory,
    ),
    totalsByUnit,
  };
}
