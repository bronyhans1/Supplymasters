import { fromMinorUnits, toMinorUnits } from "@/lib/purchasing/money";

/** Matches PostgREST max_rows; page sums stay within one response. */
export const DASHBOARD_AGGREGATE_PAGE_SIZE = 1000;

export const OPEN_DELIVERY_STATUSES = ["PENDING", "DISPATCHED"] as const;

export type ProductStockInput = {
  id: string;
  is_active: boolean;
};

export type InventoryStockInput = {
  product_id: string;
  quantity_on_hand: number;
};

/**
 * Active products with on-hand quantity zero, including active products
 * that have no inventory row. Inactive products are excluded. Duplicate
 * inventory rows for the same product_id count as one product.
 */
export function countActiveZeroStockProducts(
  products: readonly ProductStockInput[],
  inventory: readonly InventoryStockInput[],
): number {
  const qtyByProduct = new Map<string, number>();
  for (const row of inventory) {
    if (!qtyByProduct.has(row.product_id)) {
      qtyByProduct.set(row.product_id, Number(row.quantity_on_hand) || 0);
    }
  }

  let count = 0;
  for (const product of products) {
    if (!product.is_active) continue;
    const qty = qtyByProduct.get(product.id);
    if (qty === undefined || qty === 0) count += 1;
  }
  return count;
}

/**
 * Equivalent DB-side shortcut when inventory.product_id is unique:
 * active_zero = active_products - active_products_with_positive_stock.
 */
export function zeroStockCountFromTotals(
  activeProductCount: number,
  activePositiveStockCount: number,
): number {
  return Math.max(0, activeProductCount - activePositiveStockCount);
}

export async function sumMoneyAcrossPages(
  fetchPage: (from: number, to: number) => Promise<readonly number[]>,
  pageSize: number = DASHBOARD_AGGREGATE_PAGE_SIZE,
): Promise<number> {
  if (pageSize < 1) {
    throw new Error("pageSize must be at least 1.");
  }

  let minorTotal = 0;
  let from = 0;

  for (;;) {
    const to = from + pageSize - 1;
    const values = await fetchPage(from, to);
    for (const value of values) {
      minorTotal += toMinorUnits(Number(value) || 0);
    }
    if (values.length < pageSize) break;
    from += pageSize;
  }

  return fromMinorUnits(minorTotal);
}
