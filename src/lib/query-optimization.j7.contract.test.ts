import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  FILTER_OPTION_LIMIT,
  FILTER_SEARCH_LIMIT,
  SEARCH_SCOPE_ID_LIMIT,
} from "./query-limits";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("J7 query optimization contracts", () => {
  it("exposes shared search and filter caps", () => {
    assert.equal(SEARCH_SCOPE_ID_LIMIT, 75);
    assert.equal(FILTER_OPTION_LIMIT, 200);
    assert.equal(FILTER_SEARCH_LIMIT, 25);
  });

  it("A: assignment desk uses slim getter without history or supply items", () => {
    const page = read("src/app/app/assignments/[deliveryId]/page.tsx");
    const dispatchDetail = read("src/app/app/dispatch/[deliveryId]/page.tsx");
    const queries = read("src/lib/deliveries/queries.ts");
    assert.match(page, /getDeliveryForAssignment/);
    assert.match(dispatchDetail, /getDeliveryForAssignment/);
    assert.doesNotMatch(page, /getDelivery\(/);
    assert.match(queries, /export async function getDeliveryForAssignment/);
    assert.match(queries, /export async function getDelivery\(/);
    const assignmentFn = queries.slice(
      queries.indexOf("export async function getDeliveryForAssignment"),
      queries.indexOf("export async function getDeliveryForSupply"),
    );
    assert.doesNotMatch(assignmentFn, /supply_items/);
    assert.doesNotMatch(assignmentFn, /delivery_status_history/);
    assert.doesNotMatch(assignmentFn, /actor_name/);
  });

  it("B+C: returns delivery filter is searchable and page loads in parallel", () => {
    const returnsQueries = read("src/lib/returns/queries.ts");
    const returnsPage = read("src/app/app/returns/page.tsx");
    const filters = read("src/components/returns/ReturnFilters.tsx");
    assert.match(returnsQueries, /searchDeliveriesForReturnFilter/);
    assert.match(returnsQueries, /resolveDeliveryFilterOption/);
    assert.doesNotMatch(returnsQueries, /listDeliveriesForReturnFilter/);
    assert.match(returnsPage, /Promise\.all\(/);
    assert.match(returnsPage, /resolveDeliveryFilterOption/);
    assert.match(filters, /DeliveryFilterPicker/);
  });

  it("D+F: returns list embeds item quantities and drops unused staff/driver joins", () => {
    const returnsQueries = read("src/lib/returns/queries.ts");
    const listSelect = returnsQueries.slice(
      returnsQueries.indexOf("const LIST_SELECT"),
      returnsQueries.indexOf("function mapDeliverySummary"),
    );
    const listReturnsFn = returnsQueries.slice(
      returnsQueries.indexOf("export async function listReturns"),
      returnsQueries.indexOf("export async function getReturn"),
    );
    assert.match(listSelect, /items:delivery_stock_return_items \( quantity \)/);
    assert.doesNotMatch(listSelect, /responsible_staff/);
    assert.doesNotMatch(listSelect, /driver:drivers/);
    assert.doesNotMatch(
      listReturnsFn,
      /\.from\("delivery_stock_return_items"\)[\s\S]*\.in\("return_id"/,
    );
  });

  it("D: supply and purchase list selects avoid star dumps", () => {
    const supplies = read("src/lib/supplies/queries.ts");
    const purchasing = read("src/lib/purchasing/queries.ts");
    const payments = read("src/lib/payments/queries.ts");
    const listSuppliesFn = supplies.slice(
      supplies.indexOf("export async function listSupplies"),
      supplies.indexOf("export async function getSupply"),
    );
    const listPurchasesFn = purchasing.slice(
      purchasing.indexOf("export async function listPurchases"),
      purchasing.indexOf("export async function getPurchase"),
    );
    const paymentsListSelect = payments.slice(
      payments.indexOf("const LIST_SELECT"),
      payments.indexOf("function mapListRow"),
    );
    assert.match(listSuppliesFn, /items:supply_items \( quantity \)/);
    assert.doesNotMatch(listSuppliesFn, /\.select\(\s*`\s*\*/);
    assert.doesNotMatch(listPurchasesFn, /\.select\(\s*`\s*\*/);
    assert.doesNotMatch(paymentsListSelect, /^\s*\*,/m);
  });

  it("E: search scopes apply shared ID limits", () => {
    const deliveries = read("src/lib/deliveries/queries.ts");
    const returns = read("src/lib/returns/queries.ts");
    const payments = read("src/lib/payments/queries.ts");
    const supplies = read("src/lib/supplies/queries.ts");
    for (const source of [deliveries, returns, payments, supplies]) {
      assert.match(source, /SEARCH_SCOPE_ID_LIMIT/);
    }
  });

  it("G: audit enrichment reuses sanitized labels before entity lookups", () => {
    const audit = read("src/lib/audit-logs/queries.ts");
    assert.match(audit, /hasProductLabel/);
    assert.match(audit, /hasVendorLabel/);
    assert.match(audit, /hasDeliveryRef/);
    assert.match(audit, /metaLabel\(sanitizedMetadata\.delivery_ref\)/);
    assert.match(audit, /metaLabel\(sanitizedMetadata\.business_name\)/);
  });
});
