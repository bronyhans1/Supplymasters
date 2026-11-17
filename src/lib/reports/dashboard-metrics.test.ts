import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fromMinorUnits, toMinorUnits } from "@/lib/purchasing/money";
import {
  countActiveZeroStockProducts,
  DASHBOARD_AGGREGATE_PAGE_SIZE,
  OPEN_DELIVERY_STATUSES,
  sumMoneyAcrossPages,
  zeroStockCountFromTotals,
} from "./dashboard-metrics";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("countActiveZeroStockProducts", () => {
  it("counts active products with zero on-hand", () => {
    const count = countActiveZeroStockProducts(
      [
        { id: "a", is_active: true },
        { id: "b", is_active: true },
      ],
      [
        { product_id: "a", quantity_on_hand: 0 },
        { product_id: "b", quantity_on_hand: 4 },
      ],
    );
    assert.equal(count, 1);
  });

  it("excludes inactive zero-stock products", () => {
    const count = countActiveZeroStockProducts(
      [
        { id: "a", is_active: false },
        { id: "b", is_active: true },
      ],
      [
        { product_id: "a", quantity_on_hand: 0 },
        { product_id: "b", quantity_on_hand: 0 },
      ],
    );
    assert.equal(count, 1);
  });

  it("treats active products with no inventory row as zero stock", () => {
    const count = countActiveZeroStockProducts(
      [
        { id: "missing", is_active: true },
        { id: "stocked", is_active: true },
      ],
      [{ product_id: "stocked", quantity_on_hand: 2 }],
    );
    assert.equal(count, 1);
  });

  it("does not inflate counts when inventory duplicates the same product", () => {
    const count = countActiveZeroStockProducts(
      [{ id: "a", is_active: true }],
      [
        { product_id: "a", quantity_on_hand: 0 },
        { product_id: "a", quantity_on_hand: 0 },
        { product_id: "a", quantity_on_hand: 0 },
      ],
    );
    assert.equal(count, 1);
  });
});

describe("zeroStockCountFromTotals", () => {
  it("subtracts active positive stock from active products", () => {
    assert.equal(zeroStockCountFromTotals(10, 7), 3);
    assert.equal(zeroStockCountFromTotals(2, 5), 0);
  });
});

describe("sumMoneyAcrossPages", () => {
  it("aggregates money across pages larger than the PostgREST row cap", async () => {
    const page1 = Array.from({ length: DASHBOARD_AGGREGATE_PAGE_SIZE }, () => 1.1);
    const page2 = Array.from({ length: DASHBOARD_AGGREGATE_PAGE_SIZE }, () => 2.2);
    const page3 = [3.3];
    const pages = [page1, page2, page3];
    let calls = 0;

    const total = await sumMoneyAcrossPages(async () => {
      const page = pages[calls] ?? [];
      calls += 1;
      return page;
    }, DASHBOARD_AGGREGATE_PAGE_SIZE);

    assert.equal(calls, 3);
    const expectedMinor =
      DASHBOARD_AGGREGATE_PAGE_SIZE * toMinorUnits(1.1) +
      DASHBOARD_AGGREGATE_PAGE_SIZE * toMinorUnits(2.2) +
      toMinorUnits(3.3);
    assert.equal(total, fromMinorUnits(expectedMinor));
  });
});

describe("open delivery drill-down wiring", () => {
  it("dashboard open-deliveries link uses OPEN status covering pending and dispatched", () => {
    const presentation = readFileSync(
      path.join(root, "src/lib/reports/dashboard-presentation.ts"),
      "utf8",
    );
    assert.match(presentation, /\/app\/deliveries\?status=OPEN/);
    assert.deepEqual([...OPEN_DELIVERY_STATUSES], ["PENDING", "DISPATCHED"]);

    const deliveryQueries = readFileSync(
      path.join(root, "src/lib/deliveries/queries.ts"),
      "utf8",
    );
    assert.match(
      deliveryQueries,
      /status === ["']OPEN["'][\s\S]*in\(\s*["']status["']\s*,\s*\[["']PENDING["']\s*,\s*["']DISPATCHED["']\]/,
    );
  });
});
