import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("J6 product option search contracts", () => {
  it("caps typeahead results and searches active products by name and code", () => {
    const options = read("src/lib/products/options.ts");
    const actions = read("src/lib/products/actions.ts");

    assert.match(options, /PRODUCT_OPTION_SEARCH_LIMIT = 25/);
    assert.match(options, /\.eq\("is_active", true\)/);
    assert.match(
      options,
      /product_code\.ilike\.\$\{term\},name\.ilike\.\$\{term\}/,
    );
    assert.match(options, /\.limit\(limit\)/);
    assert.match(options, /Math\.min\([\s\S]*PRODUCT_OPTION_SEARCH_LIMIT/);
    assert.match(actions, /searchActiveProductOptions/);
    assert.match(actions, /\.max\(PRODUCT_OPTION_SEARCH_LIMIT\)/);
  });

  it("preserves supply stock/on-hand in shared picker and SupplyForm", () => {
    const options = read("src/lib/products/options.ts");
    const picker = read("src/components/products/ProductPicker.tsx");
    const supplyForm = read("src/components/supplies/SupplyForm.tsx");
    const supplyPage = read("src/app/app/supplies/new/page.tsx");
    const supplyQueries = read("src/lib/supplies/queries.ts");

    assert.match(options, /includeStock/);
    assert.match(options, /quantity_on_hand/);
    assert.match(options, /inventory \( quantity_on_hand \)/);
    assert.match(picker, /ProductLinePicker/);
    assert.match(picker, /includeStock/);
    assert.match(picker, /on hand/);
    assert.match(supplyForm, /ProductLinePicker/);
    assert.match(supplyForm, /includeStock/);
    assert.match(supplyForm, /quantity_on_hand/);
    assert.match(supplyForm, /productById/);
    assert.match(supplyPage, /countActiveProducts/);
    assert.match(supplyPage, /hasActiveProducts/);
    assert.doesNotMatch(supplyQueries, /listActiveProductsForSupply/);
    assert.doesNotMatch(supplyPage, /listActiveProductsForSupply/);
  });

  it("wires PurchaseForm to shared picker without full catalog dump", () => {
    const purchaseForm = read("src/components/purchasing/PurchaseForm.tsx");
    const purchasePage = read("src/app/app/purchasing/new/page.tsx");
    const purchaseQueries = read("src/lib/purchasing/queries.ts");

    assert.match(purchaseForm, /ProductLinePicker/);
    assert.match(purchaseForm, /productById/);
    assert.match(purchasePage, /requireAdmin/);
    assert.match(purchasePage, /countActiveProducts/);
    assert.match(purchasePage, /hasActiveProducts/);
    assert.doesNotMatch(purchaseQueries, /listActiveProductsForPurchase/);
    assert.doesNotMatch(purchasePage, /listActiveProductsForPurchase/);
  });

  it("uses searchable product filters for reports and returns beyond old dumps", () => {
    const reportsQueries = read("src/lib/reports/queries.ts");
    const reportFilters = read("src/components/reports/ReportFilters.tsx");
    const reportsPage = read("src/app/app/reports/page.tsx");
    const returnFilters = read("src/components/returns/ReturnFilters.tsx");
    const returnsPage = read("src/app/app/returns/page.tsx");
    const returnsQueries = read("src/lib/returns/queries.ts");

    assert.match(reportsQueries, /selectedProduct/);
    assert.match(reportsQueries, /resolveProductFilterOption/);
    assert.match(reportsQueries, /rpc\("get_reports_center_data"/);
    assert.doesNotMatch(reportsQueries, /from\("products"\)[\s\S]*\.limit\(200\)/);
    assert.match(reportFilters, /ProductFilterPicker/);
    assert.match(reportsPage, /selectedProduct=\{data\.filterOptions\.selectedProduct\}/);
    assert.match(returnFilters, /ProductFilterPicker/);
    assert.match(returnsPage, /resolveProductFilterOption/);
    assert.match(returnsPage, /selectedProduct=\{selectedProduct\}/);
    assert.doesNotMatch(returnsQueries, /listProductsForReturnFilter/);
    assert.doesNotMatch(returnsQueries, /\.limit\(500\)/);
  });
});
