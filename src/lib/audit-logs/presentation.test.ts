import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildAuditDetailFields,
  containsForbiddenTechnicalText,
  formatAuditDescription,
  formatAuditTarget,
  formatDeliveryAssignmentDescription,
  humanizeAuditAction,
  humanizeAuditEntityType,
  humanizeToken,
  resolveActorLabel,
} from "./presentation";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("humanizeAuditAction", () => {
  it("maps known actions to management labels", () => {
    assert.equal(humanizeAuditAction("PRODUCT_CREATED"), "Product created");
    assert.equal(
      humanizeAuditAction("PRODUCT_CATEGORY_CREATED"),
      "Product category created",
    );
    assert.equal(humanizeAuditAction("VENDOR_CREATED"), "Vendor registered");
    assert.equal(humanizeAuditAction("STOCK_PURCHASE_RECEIVED"), "Stock purchase received");
    assert.equal(humanizeAuditAction("STOCK_MOVEMENT_RECORDED"), "Stock movement recorded");
    assert.equal(humanizeAuditAction("SUPPLY_CREATED"), "Wholesale supply recorded");
    assert.equal(humanizeAuditAction("PAYMENT_RECORDED"), "Payment recorded");
    assert.equal(humanizeAuditAction("DELIVERY_STATUS_UPDATED"), "Delivery status updated");
    assert.equal(
      humanizeAuditAction("DELIVERY_STOCK_RETURNED"),
      "Stock returned from delivery",
    );
  });

  it("humanizes unknown actions without exposing raw identifiers", () => {
    assert.equal(humanizeAuditAction("CUSTOM_EVENT_X"), "Custom event x");
    assert.equal(humanizeToken("delivery_stock_returns"), "Delivery stock returns");
  });
});

describe("humanizeAuditEntityType", () => {
  it("maps known entity types to singular business labels", () => {
    assert.equal(humanizeAuditEntityType("stock_movements"), "Stock movement");
    assert.equal(humanizeAuditEntityType("product_categories"), "Product category");
    assert.equal(humanizeAuditEntityType("vendors"), "Vendor");
    assert.equal(humanizeAuditEntityType("stock_suppliers"), "Stock supplier");
  });
});

describe("resolveActorLabel", () => {
  it("prefers profile display names and falls back safely", () => {
    assert.equal(
      resolveActorLabel({ actorId: "11111111-1111-4111-8111-111111111111", fullName: "Ama Mensah" }),
      "Ama Mensah",
    );
    assert.equal(resolveActorLabel({ actorId: null }), "System");
    assert.equal(
      resolveActorLabel({
        actorId: "11111111-1111-4111-8111-111111111111",
        fullName: null,
      }),
      "Unknown user",
    );
    assert.equal(
      resolveActorLabel({
        actorId: "11111111-1111-4111-8111-111111111111",
        fullName: "22222222-2222-4222-8222-222222222222",
      }),
      "Unknown user",
    );
  });
});

describe("formatAuditTarget", () => {
  it("resolves business identities and never falls back to UUIDs", () => {
    assert.equal(
      formatAuditTarget(
        "STOCK_MOVEMENT_RECORDED",
        "stock_movements",
        {},
        { productName: "Verna", productCode: "NM-PRD-000002" },
      ),
      "Verna (NM-PRD-000002)",
    );
    assert.equal(
      formatAuditTarget(
        "VENDOR_CREATED",
        "vendors",
        {},
        { vendorName: "Gloria Ventures", vendorCode: "NM-VND-000003" },
      ),
      "Gloria Ventures (NM-VND-000003)",
    );
    assert.equal(
      formatAuditTarget("DELIVERY_STATUS_UPDATED", "deliveries", {}, {}),
      "Delivery",
    );
    assert.equal(
      containsForbiddenTechnicalText(
        formatAuditTarget(
          "PRODUCT_CREATED",
          "products",
          { product_id: "11111111-1111-4111-8111-111111111111" },
          {},
        ),
      ),
      false,
    );
  });
});

describe("formatAuditDescription", () => {
  it("formats stock movements with from/to quantities", () => {
    const description = formatAuditDescription(
      "STOCK_MOVEMENT_RECORDED",
      {
        movement_type: "PURCHASE",
        quantity_delta: 2,
        quantity_after: 11,
      },
      { productName: "Verna" },
    );
    assert.equal(
      description,
      "Verna\n+2 units\nStock increased from 9 to 11 units\nReason: Stock purchase",
    );
    assert.equal(containsForbiddenTechnicalText(description), false);
  });

  it("formats negative and zero stock movements", () => {
    assert.match(
      formatAuditDescription("STOCK_MOVEMENT_RECORDED", {
        movement_type: "SUPPLY",
        quantity_delta: -2,
        quantity_after: 5,
      }),
      /Stock decreased from 7 to 5 units/,
    );
    assert.match(
      formatAuditDescription("STOCK_MOVEMENT_RECORDED", {
        movement_type: "ADJUSTMENT",
        quantity_delta: 0,
        quantity_after: 4,
      }),
      /No stock change/,
    );
  });

  it("does not invent missing stock metadata", () => {
    assert.equal(
      formatAuditDescription("STOCK_MOVEMENT_RECORDED", {
        movement_type: "PURCHASE",
      }),
      "Reason: Stock purchase",
    );
  });

  it("formats purchase, vendor, supply and delivery descriptions", () => {
    assert.equal(
      formatAuditDescription(
        "STOCK_PURCHASE_RECEIVED",
        { item_count: 1, total_cost: 120 },
        { supplierName: "Kasapreko" },
      ),
      "Supplier: Kasapreko\n1 product\nTotal: GH₵120.00",
    );
    assert.equal(
      formatAuditDescription(
        "VENDOR_CREATED",
        {},
        { vendorName: "Gloria Ventures" },
      ),
      "Gloria Ventures\nVendor successfully registered",
    );
    assert.equal(
      formatAuditDescription(
        "SUPPLY_CREATED",
        { item_count: 1 },
        { vendorName: "Gloria Ventures" },
      ),
      "Vendor: Gloria Ventures\n1 product\nSupply successfully recorded",
    );
    assert.equal(
      formatAuditDescription(
        "SUPPLY_CREATED",
        {
          item_count: 2,
          grand_total: 450.5,
          payment_method: "MOBILE_MONEY",
        },
        { vendorName: "Gloria Ventures" },
      ),
      "Vendor: Gloria Ventures\n2 products\nTotal: GH₵450.50\nPayment: Mobile money\nSupply successfully recorded",
    );
    assert.equal(
      formatAuditDescription(
        "PAYMENT_RECORDED",
        {
          amount: 80,
          payment_method: "CASH",
          total_cost: 999,
        },
        { vendorName: "Gloria Ventures", paymentRef: "NM-PAY-1" },
      ),
      "Vendor: Gloria Ventures\nReference: NM-PAY-1\nAmount: GH₵80.00\nMethod: Cash\nPayment successfully recorded",
    );
    assert.equal(
      formatAuditDescription("DELIVERY_STATUS_UPDATED", {
        from_status: "PENDING",
        to_status: "DISPATCHED",
      }),
      "Delivery status changed from Pending to Dispatched",
    );
  });

  it("formats enriched assignment audits with previous → new values", () => {
    assert.equal(
      formatDeliveryAssignmentDescription("DELIVERY_DRIVER_SET", {
        change_kind: "DRIVER_CHANGED",
        delivery_ref: "NM-DEL-9",
        previous_driver_name: "Kojo",
        previous_driver_code: "DRV-1",
        new_driver_name: "Ama",
        new_driver_code: "DRV-2",
      }),
      "Operational driver changed from Kojo (DRV-1) to Ama (DRV-2) · NM-DEL-9",
    );
    assert.equal(
      formatDeliveryAssignmentDescription("DELIVERY_DRIVER_SET", {
        change_kind: "DRIVER_CLEARED",
        previous_driver_name: "Kojo",
        previous_driver_code: "DRV-1",
      }),
      "Operational driver cleared (was Kojo (DRV-1))",
    );
    assert.equal(
      formatDeliveryAssignmentDescription("DELIVERY_STAFF_SET", {
        change_kind: "STAFF_ASSIGNED",
        new_staff_name: "Ama Mensah",
        delivery_ref: "NM-DEL-9",
      }),
      "Responsible staff assigned: Ama Mensah · NM-DEL-9",
    );
  });

  it("keeps legacy thin assignment audits readable", () => {
    assert.equal(
      formatAuditDescription("DELIVERY_DRIVER_SET", {
        driver_id: null,
      }),
      "Operational driver cleared",
    );
    assert.equal(
      formatAuditDescription("DELIVERY_STAFF_SET", {
        responsible_staff_id: "11111111-1111-4111-8111-111111111111",
      }),
      "Delivery staff assignment updated",
    );
    assert.equal(
      humanizeAuditAction("DELIVERY_DRIVER_SET"),
      "Delivery driver assignment updated",
    );
  });
});

describe("buildAuditDetailFields", () => {
  it("presents supply total and payment amount from allowlisted keys", () => {
    const supplyFields = buildAuditDetailFields({
      action: "SUPPLY_CREATED",
      actorLabel: "Ama Mensah",
      createdAtLabel: "10 Nov 2026, 15:00",
      targetLabel: "Gloria Ventures",
      description: "Supply",
      sanitized: {
        item_count: 2,
        grand_total: 450.5,
        payment_method: "CASH",
      },
      context: { vendorName: "Gloria Ventures" },
    });
    const supplyByLabel = Object.fromEntries(
      supplyFields.map((field) => [field.label, field.value]),
    );
    assert.equal(supplyByLabel["Supply total"], "GH₵450.50");
    assert.equal(supplyByLabel["Payment method"], "Cash");

    const paymentFields = buildAuditDetailFields({
      action: "PAYMENT_RECORDED",
      actorLabel: "Ama Mensah",
      createdAtLabel: "10 Nov 2026, 15:00",
      targetLabel: "Gloria Ventures",
      description: "Payment",
      sanitized: {
        amount: 80,
        payment_method: "BANK_TRANSFER",
      },
      context: { vendorName: "Gloria Ventures", paymentRef: "NM-PAY-1" },
    });
    const paymentByLabel = Object.fromEntries(
      paymentFields.map((field) => [field.label, field.value]),
    );
    assert.equal(paymentByLabel["Payment amount"], "GH₵80.00");
    assert.equal(paymentByLabel["Payment method"], "Bank transfer");
    assert.equal(Object.hasOwn(paymentByLabel, "Total amount"), false);
  });

  it("uses friendly labels and suppresses UUIDs and raw JSON", () => {
    const fields = buildAuditDetailFields({
      action: "STOCK_MOVEMENT_RECORDED",
      actorLabel: "Ama Mensah",
      createdAtLabel: "10 Nov 2026, 15:00",
      targetLabel: "Verna (NM-PRD-000002)",
      description: "Verna\n+2 units",
      sanitized: {
        movement_type: "PURCHASE",
        quantity_delta: 2,
        quantity_after: 11,
        product_id: "11111111-1111-4111-8111-111111111111",
        after: { brand: "Bottle Water" },
      },
      context: {
        productName: "Verna",
        productCode: "NM-PRD-000002",
      },
    });

    const labels = fields.map((field) => field.label);
    assert.ok(labels.includes("Activity"));
    assert.ok(labels.includes("Quantity change"));
    assert.ok(labels.includes("Reason"));
    assert.equal(labels.includes("product_id"), false);
    assert.equal(labels.includes("after"), false);

    for (const field of fields) {
      assert.equal(containsForbiddenTechnicalText(field.value), false);
      assert.doesNotMatch(field.label, /_/);
    }
  });
});

describe("Audit Logs UI suppression", () => {
  it("does not render technical ID panels, raw JSON, or UUID filters", () => {
    const table = readFileSync(
      path.join(root, "src/components/audit-logs/AuditLogTable.tsx"),
      "utf8",
    );
    const filters = readFileSync(
      path.join(root, "src/components/audit-logs/AuditLogFilters.tsx"),
      "utf8",
    );
    const types = readFileSync(path.join(root, "src/lib/audit-logs/types.ts"), "utf8");

    assert.doesNotMatch(table, /Technical IDs/);
    assert.doesNotMatch(table, /JSON\.stringify/);
    assert.doesNotMatch(table, /sanitizedMetadata/);
    assert.doesNotMatch(table, /CopyIdButton/);
    assert.doesNotMatch(table, /actorId|client_request_id/);
    assert.doesNotMatch(filters, /name=["']entityId["']/);
    assert.doesNotMatch(filters, /Entity ID/);
    assert.doesNotMatch(filters, /UUID/i);
    assert.match(filters, /Search activity, person, product, vendor or reference/);
    assert.match(types, /rowKey/);
    assert.doesNotMatch(types, /actorId|entityId|sanitizedMetadata|actorEmail/);
  });
});
