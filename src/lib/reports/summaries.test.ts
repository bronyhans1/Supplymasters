import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  aggregateDeliveryStatuses,
  aggregateInventorySnapshot,
  aggregatePaymentsReport,
  aggregatePurchasesReport,
  aggregateReturnsReport,
  aggregateSuppliesReport,
  aggregateVendorReport,
} from "./summaries";

describe("report aggregations", () => {
  it("aggregates supply value from headers and quantity from lines without double money", () => {
    const result = aggregateSuppliesReport(
      [
        {
          id: "s1",
          supply_date: "2026-03-01",
          grand_total: 100,
          vendor_id: "v1",
          vendor_name: "Vendor A",
        },
        {
          id: "s2",
          supply_date: "2026-03-01",
          grand_total: 50.5,
          vendor_id: "v1",
          vendor_name: "Vendor A",
        },
      ],
      [
        {
          supply_id: "s1",
          product_id: "p1",
          product_name: "Carton A",
          quantity: 4,
        },
        {
          supply_id: "s2",
          product_id: "p1",
          product_name: "Carton A",
          quantity: 2,
        },
      ],
    );

    assert.equal(result.supplyCount, 2);
    assert.equal(result.totalSupplyValue, 150.5);
    assert.equal(result.totalQuantitySupplied, 6);
    assert.equal(result.byVendor[0]?.amount, 150.5);
    assert.equal(result.byProduct[0]?.quantity, 6);
  });

  it("uses payment amounts for cash and reconciles without summing supply totals", () => {
    const result = aggregatePaymentsReport([
      {
        id: "pay1",
        amount: 100,
        payment_method: "CASH",
        payment_date: "2026-03-01",
        payment_ref: "NM-PAY-000001",
        supply_id: "s1",
        supply_ref: "NM-SPL-000001",
        supply_grand_total: 100,
        vendor_id: "v1",
        vendor_name: "Vendor A",
      },
      {
        id: "pay2",
        amount: 40,
        payment_method: "MOBILE_MONEY",
        payment_date: "2026-03-02",
        payment_ref: "NM-PAY-000002",
        supply_id: "s2",
        supply_ref: "NM-SPL-000002",
        supply_grand_total: 50,
        vendor_id: "v1",
        vendor_name: "Vendor A",
      },
    ]);

    assert.equal(result.cashCollected.totalAmount, 140);
    assert.equal(result.cashCollected.count, 2);
    assert.equal(result.reconciliation.matchedCount, 1);
    assert.equal(result.reconciliation.mismatchedCount, 1);
    // Must never equal payment+supply combined (140+150)
    assert.notEqual(result.cashCollected.totalAmount, 290);
  });

  it("aggregates purchase cost from headers only", () => {
    const result = aggregatePurchasesReport(
      [
        {
          id: "pur1",
          purchase_date: "2026-03-01",
          total_cost: 200,
          supplier_id: "sup1",
          supplier_name: "Supplier",
        },
      ],
      [
        {
          purchase_id: "pur1",
          product_id: "p1",
          product_name: "Product",
          quantity_boxes: 8,
        },
        {
          purchase_id: "pur1",
          product_id: "p2",
          product_name: "Product 2",
          quantity_boxes: 2,
        },
      ],
    );
    assert.equal(result.totalPurchaseCost, 200);
    assert.equal(result.totalQuantityPurchased, 10);
  });

  it("counts delivery statuses without inventing inventory effects", () => {
    const counts = aggregateDeliveryStatuses([
      "PENDING",
      "DISPATCHED",
      "FAILED",
      "FAILED",
      "CANCELLED",
      "DELIVERED",
    ]);
    assert.equal(counts.PENDING, 1);
    assert.equal(counts.DISPATCHED, 1);
    assert.equal(counts.FAILED, 2);
    assert.equal(counts.CANCELLED, 1);
    assert.equal(counts.DELIVERED, 1);
  });

  it("keeps return item quantity separate from restored movement quantity", () => {
    const result = aggregateReturnsReport(
      [
        {
          return_id: "r1",
          return_created_at: "2026-03-01T10:00:00Z",
          delivery_id: "d1",
          delivery_ref: "NM-DLV-000001",
          product_id: "p1",
          product_name: "Product",
          quantity: 3,
        },
      ],
      ["r1"],
      3,
    );
    assert.equal(result.returnCount, 1);
    assert.equal(result.returnedQuantity, 3);
    assert.equal(result.inventoryRestoredQuantity, 3);
    // Must not treat item qty + movement qty as 6 returns worth of stock
    assert.notEqual(
      result.returnedQuantity + result.inventoryRestoredQuantity,
      result.returnedQuantity,
    );
    assert.equal(result.byProduct[0]?.quantity, 3);
  });

  it("snapshots on-hand inventory without valuation", () => {
    const result = aggregateInventorySnapshot(
      [
        { product_id: "p1", product_name: "A", quantity_on_hand: 4 },
        { product_id: "p2", product_name: "B", quantity_on_hand: 0 },
      ],
      2,
    );
    assert.equal(result.totalOnHand, 4);
    assert.equal(result.zeroStockCount, 1);
    assert.equal(result.productCount, 2);
  });

  it("aggregates vendor supply value separately from cash collected", () => {
    const result = aggregateVendorReport([
      {
        vendor_id: "v1",
        vendor_name: "Vendor",
        supply_id: "s1",
        supply_date: "2026-03-01",
        grand_total: 100,
        quantity: 5,
        payment_amount: 100,
        payment_date: "2026-03-01",
        payment_method: "CASH",
      },
    ]);
    assert.equal(result.totalSupplyValue, 100);
    assert.equal(result.totalCashCollected, 100);
    assert.notEqual(result.totalSupplyValue + result.totalCashCollected, 100);
  });
});
