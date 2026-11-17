import type { DeliveryStatus, PaymentMethod } from "@/types/database";

/** Wire shape returned by public.get_reports_center_data (numeric often serialized as string). */
export type ReportsRpcPayload = {
  page: number;
  pageSize: number;
  fromDate: string;
  toDate: string;
  supplies: {
    supplyCount: number;
    totalSupplyValue: number | string;
    totalQuantitySupplied: number | string;
    byDate: Array<{
      date: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    byVendor: Array<{
      id: string;
      label: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    byProduct: Array<{
      id: string;
      label: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    history: Array<{
      id: string;
      supply_date: string;
      grand_total: number | string;
      vendor_id: string;
      vendor_name: string;
    }>;
    historyTotal: number;
  };
  payments: {
    cashCollected: {
      count: number;
      totalAmount: number | string;
      byMethod: Array<{
        method: PaymentMethod;
        count: number;
        amount: number | string;
      }>;
    };
    byDate: Array<{
      date: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    byVendor: Array<{
      id: string;
      label: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    historyPage: Array<{
      id: string;
      amount: number | string;
      payment_method: PaymentMethod;
      payment_date: string;
      payment_ref: string;
      supply_id: string;
      supply_ref: string | null;
      supply_grand_total: number | string | null;
      vendor_id: string;
      vendor_name: string;
    }>;
    historyTotal: number;
    reconciliation: {
      matchedCount: number;
      mismatchedCount: number;
      missingSupplyCount: number;
      mismatches: Array<{
        paymentId: string;
        paymentRef: string;
        paymentAmount: number | string;
        supplyGrandTotal: number | string | null;
      }>;
    };
  };
  purchasing: {
    purchaseCount: number;
    totalPurchaseCost: number | string;
    totalQuantityPurchased: number | string;
    bySupplier: Array<{
      id: string;
      label: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    byDate: Array<{
      date: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    history: Array<{
      id: string;
      purchase_date: string;
      total_cost: number | string;
      supplier_id: string;
      supplier_name: string;
    }>;
    historyTotal: number;
  };
  deliveries: {
    counts: Record<
      "PENDING" | "DISPATCHED" | "DELIVERED" | "FAILED" | "CANCELLED" | "OTHER",
      number
    >;
    total: number;
    history: Array<{
      id: string;
      delivery_ref: string;
      status: DeliveryStatus;
      delivery_date: string;
      vendor_name: string | null;
      staff_name: string | null;
      driver_name: string | null;
    }>;
    historyTotal: number;
  };
  returns: {
    returnCount: number;
    returnedQuantity: number | string;
    inventoryRestoredQuantity: number | string;
    byDate: Array<{
      date: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    byProduct: Array<{
      id: string;
      label: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    byDelivery: Array<{
      id: string;
      label: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    note: string;
  };
  inventory: {
    productCount: number;
    inventoryRowCount: number;
    totalOnHand: number | string;
    zeroStockCount: number;
    zeroStock: Array<{
      product_id: string;
      product_name: string;
      quantity_on_hand: number | string;
    }>;
    adjustments: Array<{
      id: string;
      product_name: string;
      quantity_delta: number | string;
      reason: string | null;
      created_at: string;
    }>;
    movements: Array<{
      id: string;
      product_name: string;
      movement_type: string;
      quantity_delta: number | string;
      created_at: string;
    }>;
  };
  vendors: {
    vendorCount: number;
    supplyCount: number;
    totalSupplyValue: number | string;
    totalQuantity: number | string;
    totalCashCollected: number | string;
    byVendor: Array<{
      id: string;
      label: string;
      count: number;
      quantity: number | string;
      amount: number | string;
    }>;
    history: Array<{
      vendor_id: string;
      vendor_name: string;
      supply_id: string;
      supply_date: string;
      grand_total: number | string;
      quantity: number | string;
      payment_amount: number | string | null;
      payment_date: string | null;
      payment_method: PaymentMethod | null;
    }>;
    historyTotal: number;
  };
};

export function asNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function asNumberOrNull(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}
