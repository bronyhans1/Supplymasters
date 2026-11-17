import type { DeliveryStatus, PaymentMethod } from "@/types/database";
import type {
  PaymentReportRow,
  PurchaseHeaderRow,
  SupplyHeaderRow,
  VendorSupplyPaymentRow,
} from "./summaries";
import {
  asNumber,
  asNumberOrNull,
  type ReportsRpcPayload,
} from "./rpc-types";

function mapNamed(
  rows: Array<{
    id: string;
    label: string;
    count: number;
    quantity: number | string;
    amount: number | string;
  }>,
) {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    count: Number(row.count) || 0,
    quantity: asNumber(row.quantity),
    amount: asNumber(row.amount),
  }));
}

function mapDateBuckets(
  rows: Array<{
    date: string;
    count: number;
    quantity: number | string;
    amount: number | string;
  }>,
) {
  return rows.map((row) => ({
    date: row.date,
    count: Number(row.count) || 0,
    quantity: asNumber(row.quantity),
    amount: asNumber(row.amount),
  }));
}

export type ReportsCenterMappedPayload = {
  supplies: {
    supplyCount: number;
    totalSupplyValue: number;
    totalQuantitySupplied: number;
    byDate: ReturnType<typeof mapDateBuckets>;
    byVendor: ReturnType<typeof mapNamed>;
    byProduct: ReturnType<typeof mapNamed>;
    history: SupplyHeaderRow[];
    historyTotal: number;
  };
  payments: {
    cashCollected: {
      count: number;
      totalAmount: number;
      byMethod: Array<{ method: PaymentMethod; count: number; amount: number }>;
    };
    byDate: ReturnType<typeof mapDateBuckets>;
    byVendor: ReturnType<typeof mapNamed>;
    historyPage: PaymentReportRow[];
    historyTotal: number;
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
  };
  inventory: {
    productCount: number;
    inventoryRowCount: number;
    totalOnHand: number;
    zeroStockCount: number;
    zeroStock: Array<{
      product_id: string;
      product_name: string;
      quantity_on_hand: number;
    }>;
    adjustments: Array<{
      id: string;
      product_name: string;
      quantity_delta: number;
      reason: string | null;
      created_at: string;
    }>;
    movements: Array<{
      id: string;
      product_name: string;
      movement_type: string;
      quantity_delta: number;
      created_at: string;
    }>;
  };
  purchasing: {
    purchaseCount: number;
    totalPurchaseCost: number;
    totalQuantityPurchased: number;
    bySupplier: ReturnType<typeof mapNamed>;
    byDate: ReturnType<typeof mapDateBuckets>;
    history: PurchaseHeaderRow[];
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
    returnedQuantity: number;
    inventoryRestoredQuantity: number;
    byDate: ReturnType<typeof mapDateBuckets>;
    byProduct: ReturnType<typeof mapNamed>;
    byDelivery: ReturnType<typeof mapNamed>;
    note: string;
  };
  vendors: {
    vendorCount: number;
    supplyCount: number;
    totalSupplyValue: number;
    totalQuantity: number;
    totalCashCollected: number;
    byVendor: ReturnType<typeof mapNamed>;
    history: VendorSupplyPaymentRow[];
    historyTotal: number;
  };
};

/** Maps DB JSON from get_reports_center_data to the Reports Center view model. */
export function mapReportsRpc(
  payload: ReportsRpcPayload,
): ReportsCenterMappedPayload {
  return {
    supplies: {
      supplyCount: Number(payload.supplies.supplyCount) || 0,
      totalSupplyValue: asNumber(payload.supplies.totalSupplyValue),
      totalQuantitySupplied: asNumber(payload.supplies.totalQuantitySupplied),
      byDate: mapDateBuckets(payload.supplies.byDate ?? []),
      byVendor: mapNamed(payload.supplies.byVendor ?? []),
      byProduct: mapNamed(payload.supplies.byProduct ?? []),
      history: (payload.supplies.history ?? []).map((row) => ({
        id: row.id,
        supply_date: row.supply_date,
        grand_total: asNumber(row.grand_total),
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name,
      })),
      historyTotal: Number(payload.supplies.historyTotal) || 0,
    },
    payments: {
      cashCollected: {
        count: Number(payload.payments.cashCollected.count) || 0,
        totalAmount: asNumber(payload.payments.cashCollected.totalAmount),
        byMethod: (payload.payments.cashCollected.byMethod ?? []).map((row) => ({
          method: row.method,
          count: Number(row.count) || 0,
          amount: asNumber(row.amount),
        })),
      },
      byDate: mapDateBuckets(payload.payments.byDate ?? []),
      byVendor: mapNamed(payload.payments.byVendor ?? []),
      historyPage: (payload.payments.historyPage ?? []).map((row) => ({
        id: row.id,
        amount: asNumber(row.amount),
        payment_method: row.payment_method,
        payment_date: row.payment_date,
        payment_ref: row.payment_ref,
        supply_id: row.supply_id,
        supply_ref: row.supply_ref,
        supply_grand_total: asNumberOrNull(row.supply_grand_total),
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name,
      })),
      historyTotal: Number(payload.payments.historyTotal) || 0,
      reconciliation: {
        matchedCount: Number(payload.payments.reconciliation.matchedCount) || 0,
        mismatchedCount:
          Number(payload.payments.reconciliation.mismatchedCount) || 0,
        missingSupplyCount:
          Number(payload.payments.reconciliation.missingSupplyCount) || 0,
        mismatches: (payload.payments.reconciliation.mismatches ?? []).map(
          (row) => ({
            paymentId: row.paymentId,
            paymentRef: row.paymentRef,
            paymentAmount: asNumber(row.paymentAmount),
            supplyGrandTotal: asNumberOrNull(row.supplyGrandTotal),
          }),
        ),
      },
    },
    purchasing: {
      purchaseCount: Number(payload.purchasing.purchaseCount) || 0,
      totalPurchaseCost: asNumber(payload.purchasing.totalPurchaseCost),
      totalQuantityPurchased: asNumber(payload.purchasing.totalQuantityPurchased),
      bySupplier: mapNamed(payload.purchasing.bySupplier ?? []),
      byDate: mapDateBuckets(payload.purchasing.byDate ?? []),
      history: (payload.purchasing.history ?? []).map((row) => ({
        id: row.id,
        purchase_date: row.purchase_date,
        total_cost: asNumber(row.total_cost),
        supplier_id: row.supplier_id,
        supplier_name: row.supplier_name,
      })),
      historyTotal: Number(payload.purchasing.historyTotal) || 0,
    },
    deliveries: {
      counts: {
        PENDING: Number(payload.deliveries.counts?.PENDING) || 0,
        DISPATCHED: Number(payload.deliveries.counts?.DISPATCHED) || 0,
        DELIVERED: Number(payload.deliveries.counts?.DELIVERED) || 0,
        FAILED: Number(payload.deliveries.counts?.FAILED) || 0,
        CANCELLED: Number(payload.deliveries.counts?.CANCELLED) || 0,
        OTHER: Number(payload.deliveries.counts?.OTHER) || 0,
      },
      total: Number(payload.deliveries.total) || 0,
      history: (payload.deliveries.history ?? []).map((row) => ({
        id: row.id,
        delivery_ref: row.delivery_ref,
        status: row.status,
        delivery_date: row.delivery_date,
        vendor_name: row.vendor_name,
        staff_name: row.staff_name,
        driver_name: row.driver_name,
      })),
      historyTotal: Number(payload.deliveries.historyTotal) || 0,
    },
    returns: {
      returnCount: Number(payload.returns.returnCount) || 0,
      returnedQuantity: asNumber(payload.returns.returnedQuantity),
      inventoryRestoredQuantity: asNumber(
        payload.returns.inventoryRestoredQuantity,
      ),
      byDate: mapDateBuckets(payload.returns.byDate ?? []),
      byProduct: mapNamed(payload.returns.byProduct ?? []),
      byDelivery: mapNamed(payload.returns.byDelivery ?? []),
      note: payload.returns.note,
    },
    inventory: {
      productCount: Number(payload.inventory.productCount) || 0,
      inventoryRowCount: Number(payload.inventory.inventoryRowCount) || 0,
      totalOnHand: asNumber(payload.inventory.totalOnHand),
      zeroStockCount: Number(payload.inventory.zeroStockCount) || 0,
      zeroStock: (payload.inventory.zeroStock ?? []).map((row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        quantity_on_hand: asNumber(row.quantity_on_hand),
      })),
      adjustments: (payload.inventory.adjustments ?? []).map((row) => ({
        id: row.id,
        product_name: row.product_name,
        quantity_delta: asNumber(row.quantity_delta),
        reason: row.reason,
        created_at: row.created_at,
      })),
      movements: (payload.inventory.movements ?? []).map((row) => ({
        id: row.id,
        product_name: row.product_name,
        movement_type: row.movement_type,
        quantity_delta: asNumber(row.quantity_delta),
        created_at: row.created_at,
      })),
    },
    vendors: {
      vendorCount: Number(payload.vendors.vendorCount) || 0,
      supplyCount: Number(payload.vendors.supplyCount) || 0,
      totalSupplyValue: asNumber(payload.vendors.totalSupplyValue),
      totalQuantity: asNumber(payload.vendors.totalQuantity),
      totalCashCollected: asNumber(payload.vendors.totalCashCollected),
      byVendor: mapNamed(payload.vendors.byVendor ?? []),
      history: (payload.vendors.history ?? []).map((row) => ({
        vendor_id: row.vendor_id,
        vendor_name: row.vendor_name,
        supply_id: row.supply_id,
        supply_date: row.supply_date,
        grand_total: asNumber(row.grand_total),
        quantity: asNumber(row.quantity),
        payment_amount: asNumberOrNull(row.payment_amount),
        payment_date: row.payment_date,
        payment_method: row.payment_method,
      })),
      historyTotal: Number(payload.vendors.historyTotal) || 0,
    },
  };
}
