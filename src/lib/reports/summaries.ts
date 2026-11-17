import type { DeliveryStatus, PaymentMethod } from "@/types/database";
import {
  aggregatePaymentAmounts,
  type PaymentAmountRow,
  type PaymentAggregate,
} from "@/lib/payments/summaries";
import { fromMinorUnits, toMinorUnits } from "@/lib/purchasing/money";

export { aggregatePaymentAmounts };
export type { PaymentAggregate };

export type NamedTotal = {
  id: string;
  label: string;
  count: number;
  quantity: number;
  amount: number;
};

export type DateBucket = {
  date: string;
  count: number;
  quantity: number;
  amount: number;
};

function addNamed(
  map: Map<string, NamedTotal>,
  id: string,
  label: string,
  quantity: number,
  amountMinor: number,
) {
  const existing = map.get(id) ?? {
    id,
    label,
    count: 0,
    quantity: 0,
    amount: 0,
  };
  existing.count += 1;
  existing.quantity += quantity;
  existing.amount = fromMinorUnits(
    toMinorUnits(existing.amount) + amountMinor,
  );
  map.set(id, existing);
}

function addDateBucket(
  map: Map<string, DateBucket>,
  date: string,
  quantity: number,
  amountMinor: number,
) {
  const key = date.slice(0, 10);
  const existing = map.get(key) ?? {
    date: key,
    count: 0,
    quantity: 0,
    amount: 0,
  };
  existing.count += 1;
  existing.quantity += quantity;
  existing.amount = fromMinorUnits(
    toMinorUnits(existing.amount) + amountMinor,
  );
  map.set(key, existing);
}

export type SupplyHeaderRow = {
  id: string;
  supply_date: string;
  grand_total: number;
  vendor_id: string;
  vendor_name: string;
};

export type SupplyItemQtyRow = {
  supply_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
};

/**
 * Supply report aggregates.
 * Uses supplies.grand_total as the money spine — never sum line totals into the same KPI.
 */
export function aggregateSuppliesReport(
  supplies: readonly SupplyHeaderRow[],
  items: readonly SupplyItemQtyRow[],
): {
  supplyCount: number;
  totalSupplyValue: number;
  totalQuantitySupplied: number;
  byDate: DateBucket[];
  byVendor: NamedTotal[];
  byProduct: NamedTotal[];
} {
  let totalMinor = 0;
  const byDate = new Map<string, DateBucket>();
  const byVendor = new Map<string, NamedTotal>();

  for (const supply of supplies) {
    const amountMinor = toMinorUnits(Number(supply.grand_total));
    totalMinor += amountMinor;
    addDateBucket(byDate, supply.supply_date, 0, amountMinor);
    addNamed(
      byVendor,
      supply.vendor_id,
      supply.vendor_name || "Unknown vendor",
      0,
      amountMinor,
    );
  }

  let totalQuantity = 0;
  const byProduct = new Map<string, NamedTotal>();
  const qtyBySupply = new Map<string, number>();

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    totalQuantity += qty;
    qtyBySupply.set(
      item.supply_id,
      (qtyBySupply.get(item.supply_id) ?? 0) + qty,
    );
    const existing = byProduct.get(item.product_id) ?? {
      id: item.product_id,
      label: item.product_name || "Unknown product",
      count: 0,
      quantity: 0,
      amount: 0,
    };
    existing.count += 1;
    existing.quantity += qty;
    byProduct.set(item.product_id, existing);
  }

  for (const supply of supplies) {
    const qty = qtyBySupply.get(supply.id) ?? 0;
    const dateKey = supply.supply_date.slice(0, 10);
    const dateBucket = byDate.get(dateKey);
    if (dateBucket) dateBucket.quantity += qty;
    const vendor = byVendor.get(supply.vendor_id);
    if (vendor) vendor.quantity += qty;
  }

  return {
    supplyCount: supplies.length,
    totalSupplyValue: fromMinorUnits(totalMinor),
    totalQuantitySupplied: totalQuantity,
    byDate: [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
    byVendor: [...byVendor.values()].sort((a, b) => b.amount - a.amount),
    byProduct: [...byProduct.values()].sort((a, b) => b.quantity - a.quantity),
  };
}

export type PaymentReportRow = PaymentAmountRow & {
  id: string;
  payment_date: string;
  payment_ref: string;
  supply_id: string;
  supply_ref: string | null;
  supply_grand_total: number | null;
  vendor_id: string;
  vendor_name: string;
};

/**
 * Cash collected uses payments.amount only.
 * Reconciliation compares payment amount to linked supply grand_total — never adds them.
 */
export function aggregatePaymentsReport(rows: readonly PaymentReportRow[]): {
  cashCollected: PaymentAggregate;
  byDate: DateBucket[];
  byVendor: NamedTotal[];
  history: PaymentReportRow[];
  reconciliation: {
    matchedCount: number;
    mismatchedCount: number;
    missingSupplyCount: number;
    mismatches: Array<{
      paymentId: string;
      paymentRef: string;
      paymentAmount: number;
      supplyGrandTotal: number | null;
    }>;
  };
} {
  const cashCollected = aggregatePaymentAmounts(rows);
  const byDate = new Map<string, DateBucket>();
  const byVendor = new Map<string, NamedTotal>();
  let matchedCount = 0;
  let mismatchedCount = 0;
  let missingSupplyCount = 0;
  const mismatches: Array<{
    paymentId: string;
    paymentRef: string;
    paymentAmount: number;
    supplyGrandTotal: number | null;
  }> = [];

  for (const row of rows) {
    const amountMinor = toMinorUnits(Number(row.amount));
    addDateBucket(byDate, row.payment_date, 0, amountMinor);
    addNamed(
      byVendor,
      row.vendor_id,
      row.vendor_name || "Unknown vendor",
      0,
      amountMinor,
    );

    if (row.supply_grand_total === null || row.supply_grand_total === undefined) {
      missingSupplyCount += 1;
      mismatches.push({
        paymentId: row.id,
        paymentRef: row.payment_ref,
        paymentAmount: Number(row.amount),
        supplyGrandTotal: null,
      });
      continue;
    }

    if (
      toMinorUnits(Number(row.amount)) ===
      toMinorUnits(Number(row.supply_grand_total))
    ) {
      matchedCount += 1;
    } else {
      mismatchedCount += 1;
      mismatches.push({
        paymentId: row.id,
        paymentRef: row.payment_ref,
        paymentAmount: Number(row.amount),
        supplyGrandTotal: Number(row.supply_grand_total),
      });
    }
  }

  return {
    cashCollected,
    byDate: [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
    byVendor: [...byVendor.values()].sort((a, b) => b.amount - a.amount),
    history: [...rows].sort((a, b) =>
      b.payment_date.localeCompare(a.payment_date),
    ),
    reconciliation: {
      matchedCount,
      mismatchedCount,
      missingSupplyCount,
      mismatches: mismatches.slice(0, 50),
    },
  };
}

export type PurchaseHeaderRow = {
  id: string;
  purchase_date: string;
  total_cost: number;
  supplier_id: string;
  supplier_name: string;
};

export type PurchaseItemQtyRow = {
  purchase_id: string;
  product_id: string;
  product_name: string;
  quantity_boxes: number;
};

/** Purchase cost uses stock_purchases.total_cost — never add line totals into the same KPI. */
export function aggregatePurchasesReport(
  purchases: readonly PurchaseHeaderRow[],
  items: readonly PurchaseItemQtyRow[],
): {
  purchaseCount: number;
  totalPurchaseCost: number;
  totalQuantityPurchased: number;
  bySupplier: NamedTotal[];
  byDate: DateBucket[];
} {
  let totalMinor = 0;
  const bySupplier = new Map<string, NamedTotal>();
  const byDate = new Map<string, DateBucket>();
  const qtyByPurchase = new Map<string, number>();

  for (const item of items) {
    const qty = Number(item.quantity_boxes) || 0;
    qtyByPurchase.set(
      item.purchase_id,
      (qtyByPurchase.get(item.purchase_id) ?? 0) + qty,
    );
  }

  let totalQuantity = 0;
  for (const purchase of purchases) {
    const amountMinor = toMinorUnits(Number(purchase.total_cost));
    totalMinor += amountMinor;
    const qty = qtyByPurchase.get(purchase.id) ?? 0;
    totalQuantity += qty;
    addDateBucket(byDate, purchase.purchase_date, qty, amountMinor);
    addNamed(
      bySupplier,
      purchase.supplier_id,
      purchase.supplier_name || "Unknown supplier",
      qty,
      amountMinor,
    );
  }

  return {
    purchaseCount: purchases.length,
    totalPurchaseCost: fromMinorUnits(totalMinor),
    totalQuantityPurchased: totalQuantity,
    bySupplier: [...bySupplier.values()].sort((a, b) => b.amount - a.amount),
    byDate: [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

export type DeliveryStatusCount = Record<
  "PENDING" | "DISPATCHED" | "DELIVERED" | "FAILED" | "CANCELLED" | "OTHER",
  number
>;

export function aggregateDeliveryStatuses(
  statuses: readonly DeliveryStatus[],
): DeliveryStatusCount {
  const counts: DeliveryStatusCount = {
    PENDING: 0,
    DISPATCHED: 0,
    DELIVERED: 0,
    FAILED: 0,
    CANCELLED: 0,
    OTHER: 0,
  };
  for (const status of statuses) {
    if (
      status === "PENDING" ||
      status === "DISPATCHED" ||
      status === "DELIVERED" ||
      status === "FAILED" ||
      status === "CANCELLED"
    ) {
      counts[status] += 1;
    } else {
      counts.OTHER += 1;
    }
  }
  return counts;
}

export type ReturnItemRow = {
  return_id: string;
  return_created_at: string;
  delivery_id: string;
  delivery_ref: string;
  product_id: string;
  product_name: string;
  quantity: number;
};

/**
 * Return quantity aggregates from return items only.
 * Inventory restored is reported separately from DELIVERY_RETURN movements —
 * do not add item qty + movement qty as two returns.
 */
export function aggregateReturnsReport(
  items: readonly ReturnItemRow[],
  distinctReturnIds: readonly string[],
  restoredQuantityFromMovements: number,
): {
  returnCount: number;
  returnedQuantity: number;
  inventoryRestoredQuantity: number;
  byDate: DateBucket[];
  byProduct: NamedTotal[];
  byDelivery: NamedTotal[];
} {
  const byDate = new Map<string, DateBucket>();
  const byProduct = new Map<string, NamedTotal>();
  const byDelivery = new Map<string, NamedTotal>();
  let returnedQuantity = 0;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    returnedQuantity += qty;
    const day = item.return_created_at.slice(0, 10);
    addDateBucket(byDate, day, qty, 0);
    addNamed(
      byProduct,
      item.product_id,
      item.product_name || "Unknown product",
      qty,
      0,
    );
    // count here is line contributions; delivery count fixed below
    const delivery = byDelivery.get(item.delivery_id) ?? {
      id: item.delivery_id,
      label: item.delivery_ref || item.delivery_id,
      count: 0,
      quantity: 0,
      amount: 0,
    };
    delivery.quantity += qty;
    byDelivery.set(item.delivery_id, delivery);
  }

  const returnsPerDelivery = new Map<string, Set<string>>();
  for (const item of items) {
    const set = returnsPerDelivery.get(item.delivery_id) ?? new Set<string>();
    set.add(item.return_id);
    returnsPerDelivery.set(item.delivery_id, set);
  }
  for (const [deliveryId, returnIds] of returnsPerDelivery) {
    const entry = byDelivery.get(deliveryId);
    if (entry) entry.count = returnIds.size;
  }

  return {
    returnCount: distinctReturnIds.length,
    returnedQuantity,
    inventoryRestoredQuantity: restoredQuantityFromMovements,
    byDate: [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
    byProduct: [...byProduct.values()].sort((a, b) => b.quantity - a.quantity),
    byDelivery: [...byDelivery.values()].sort(
      (a, b) => b.quantity - a.quantity,
    ),
  };
}

export type InventorySnapshotRow = {
  product_id: string;
  product_name: string;
  quantity_on_hand: number;
};

export function aggregateInventorySnapshot(
  rows: readonly InventorySnapshotRow[],
  productCount: number,
): {
  productCount: number;
  inventoryRowCount: number;
  totalOnHand: number;
  zeroStockCount: number;
  zeroStock: InventorySnapshotRow[];
} {
  let totalOnHand = 0;
  const zeroStock: InventorySnapshotRow[] = [];
  for (const row of rows) {
    const qty = Number(row.quantity_on_hand) || 0;
    totalOnHand += qty;
    if (qty === 0) zeroStock.push(row);
  }
  return {
    productCount,
    inventoryRowCount: rows.length,
    totalOnHand,
    zeroStockCount: zeroStock.length,
    zeroStock: zeroStock.sort((a, b) =>
      a.product_name.localeCompare(b.product_name),
    ),
  };
}

export type VendorSupplyPaymentRow = {
  vendor_id: string;
  vendor_name: string;
  supply_id: string;
  supply_date: string;
  grand_total: number;
  quantity: number;
  payment_amount: number | null;
  payment_date: string | null;
  payment_method: PaymentMethod | null;
};

export function aggregateVendorReport(
  rows: readonly VendorSupplyPaymentRow[],
): {
  vendorCount: number;
  supplyCount: number;
  totalSupplyValue: number;
  totalQuantity: number;
  totalCashCollected: number;
  byVendor: NamedTotal[];
} {
  const byVendor = new Map<string, NamedTotal>();
  let totalSupplyMinor = 0;
  let totalCashMinor = 0;
  let totalQuantity = 0;

  for (const row of rows) {
    const supplyMinor = toMinorUnits(Number(row.grand_total));
    totalSupplyMinor += supplyMinor;
    totalQuantity += Number(row.quantity) || 0;
    if (row.payment_amount !== null && row.payment_amount !== undefined) {
      totalCashMinor += toMinorUnits(Number(row.payment_amount));
    }
    addNamed(
      byVendor,
      row.vendor_id,
      row.vendor_name || "Unknown vendor",
      Number(row.quantity) || 0,
      supplyMinor,
    );
  }

  return {
    vendorCount: byVendor.size,
    supplyCount: rows.length,
    totalSupplyValue: fromMinorUnits(totalSupplyMinor),
    totalQuantity,
    totalCashCollected: fromMinorUnits(totalCashMinor),
    byVendor: [...byVendor.values()].sort((a, b) => b.amount - a.amount),
  };
}
