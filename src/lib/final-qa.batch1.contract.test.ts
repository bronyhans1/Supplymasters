import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("FQA Batch 1 contracts", () => {
  it("FQA-001: purchase receive maps admin denial and fingerprint conflict", () => {
    const errors = read("src/lib/purchasing/db-errors.ts");
    const tests = read("src/lib/purchasing/schemas.test.ts");
    assert.match(errors, /only administrators may receive/);
    assert.match(errors, /different stock purchase/);
    assert.match(errors, /new AppError\(\s*403,\s*"FORBIDDEN"/);
    assert.match(errors, /new AppError\(\s*409,\s*"REQUEST_CONFLICT"/);
    assert.match(tests, /maps admin-only denial to 403/);
    assert.match(tests, /maps fingerprint conflict to 409/);
  });

  it("FQA-003: products and delivery detail pages hard-require staff/admin", () => {
    const products = read("src/app/app/products/page.tsx");
    const productDetail = read("src/app/app/products/[productId]/page.tsx");
    const deliveryDetail = read("src/app/app/deliveries/[deliveryId]/page.tsx");
    for (const source of [products, productDetail, deliveryDetail]) {
      assert.match(source, /requireStaffOrAdmin/);
      assert.doesNotMatch(source, /requireAdmin\(\)/);
    }
  });

  it("FQA-004: vendor/supplier create and filter use bounded searchable pickers", () => {
    const options = read("src/lib/partners/options.ts");
    const actions = read("src/lib/partners/actions.ts");
    const picker = read("src/components/partners/PartnerPicker.tsx");
    const supplyForm = read("src/components/supplies/SupplyForm.tsx");
    const supplyNew = read("src/app/app/supplies/new/page.tsx");
    const supplyList = read("src/app/app/supplies/page.tsx");
    const supplyFilters = read("src/components/supplies/SupplyFilters.tsx");
    const purchaseForm = read("src/components/purchasing/PurchaseForm.tsx");
    const purchaseNew = read("src/app/app/purchasing/new/page.tsx");
    const purchaseList = read("src/app/app/purchasing/page.tsx");
    const purchaseFilters = read("src/components/purchasing/PurchaseFilters.tsx");

    assert.match(options, /searchActiveVendorOptions/);
    assert.match(options, /searchActiveSupplierOptions/);
    assert.match(options, /resolveVendorFilterOption/);
    assert.match(options, /resolveSupplierFilterOption/);
    assert.match(options, /FILTER_SEARCH_LIMIT/);
    assert.match(options, /\.eq\("is_active", true\)/);
    assert.match(actions, /searchActiveVendorsAction/);
    assert.match(actions, /searchActiveSuppliersAction/);
    assert.match(picker, /VendorLinePicker/);
    assert.match(picker, /SupplierLinePicker/);
    assert.match(picker, /VendorFilterPicker/);
    assert.match(picker, /SupplierFilterPicker/);

    assert.match(supplyForm, /VendorLinePicker/);
    assert.match(supplyForm, /hasActiveVendors/);
    assert.match(supplyNew, /countActiveVendors/);
    assert.doesNotMatch(supplyNew, /listActiveVendorsForSupply/);
    assert.match(supplyList, /resolveVendorFilterOption/);
    assert.doesNotMatch(supplyList, /listActiveVendorsForSupply/);
    assert.match(supplyFilters, /VendorFilterPicker/);
    assert.doesNotMatch(supplyFilters, /vendors\.map/);

    assert.match(purchaseForm, /SupplierLinePicker/);
    assert.match(purchaseForm, /hasActiveSuppliers/);
    assert.match(purchaseNew, /countActiveSuppliers/);
    assert.doesNotMatch(purchaseNew, /listActiveSuppliersForPurchase/);
    assert.match(purchaseList, /resolveSupplierFilterOption/);
    assert.doesNotMatch(purchaseList, /listActiveSuppliersForPurchase/);
    assert.match(purchaseFilters, /SupplierFilterPicker/);
    assert.doesNotMatch(purchaseFilters, /suppliers\.map/);
  });

  it("FQA-005: returnable delivery create uses searchable typeahead not a 200 dump", () => {
    const queries = read("src/lib/returns/queries.ts");
    const actions = read("src/lib/returns/actions.ts");
    const form = read("src/components/returns/RecordReturnForm.tsx");
    const page = read("src/app/app/returns/new/page.tsx");
    const picker = read("src/components/returns/ReturnableDeliveryPicker.tsx");

    assert.match(queries, /searchReturnableDeliveries/);
    assert.match(queries, /resolveReturnableDeliveryOption/);
    assert.match(queries, /\.in\("status", \["FAILED", "CANCELLED"\]\)/);
    assert.match(queries, /FILTER_SEARCH_LIMIT/);
    assert.doesNotMatch(queries, /listReturnableDeliveries/);
    assert.match(actions, /searchReturnableDeliveriesAction/);
    assert.match(picker, /ReturnableDeliveryPicker/);
    assert.match(form, /ReturnableDeliveryPicker/);
    assert.doesNotMatch(form, /deliveryOptions/);
    assert.match(page, /resolveReturnableDeliveryOption/);
    assert.doesNotMatch(page, /listReturnableDeliveries/);
  });

  it("FQA-007: audit filter options drop DELIVERY_ASSIGNED and include USER_PROVISIONED", () => {
    const schemas = read("src/lib/audit-logs/schemas.ts");
    const presentation = read("src/lib/audit-logs/presentation.ts");
    assert.doesNotMatch(schemas, /DELIVERY_ASSIGNED/);
    assert.match(schemas, /USER_PROVISIONED/);
    assert.match(presentation, /USER_PROVISIONED:\s*"User provisioned"/);
    assert.match(presentation, /DELIVERY_ASSIGNED:\s*"Delivery assigned"/);
  });

  it("FQA-008: product and delivery pickers expose combobox keyboard a11y", () => {
    const productPicker = read("src/components/products/ProductPicker.tsx");
    const deliveryPicker = read("src/components/returns/DeliveryFilterPicker.tsx");
    const partnerPicker = read("src/components/partners/PartnerPicker.tsx");
    const hook = read("src/components/ui/use-combobox-list.ts");
    const returnFilters = read("src/components/returns/ReturnFilters.tsx");

    assert.match(hook, /useComboboxList/);
    assert.match(hook, /ArrowDown/);
    assert.match(hook, /ArrowUp/);
    assert.match(hook, /Escape/);
    assert.match(hook, /Enter/);

    for (const source of [productPicker, deliveryPicker, partnerPicker]) {
      assert.match(source, /useComboboxList/);
      assert.match(source, /aria-labelledby/);
      assert.match(source, /aria-selected=\{index === activeIndex\}/);
      assert.match(source, /aria-activedescendant/);
      assert.match(source, /role="status"/);
    }

    assert.match(returnFilters, /DeliveryFilterPicker/);
    assert.match(returnFilters, /ProductFilterPicker/);
    assert.doesNotMatch(returnFilters, />\s*Delivery\s*<\/span>\s*<DeliveryFilterPicker/);
    assert.doesNotMatch(returnFilters, />\s*Product\s*<\/span>\s*<ProductFilterPicker/);
  });
});
