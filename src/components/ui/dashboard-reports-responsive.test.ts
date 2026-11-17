import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Phase 2 Part 4 responsive dashboard and reports", () => {
  it("uses PageHeader on staff, admin, and reports dashboards", () => {
    for (const file of [
      "app/app/staff/page.tsx",
      "app/app/admin/page.tsx",
      "app/app/reports/page.tsx",
    ]) {
      assert.match(read(file), /PageHeader/, `${file} should use PageHeader`);
    }
  });

  it("keeps six dashboard metric cards with wrap-safe values", () => {
    const metrics = read("components/dashboard/DashboardMetrics.tsx");
    assert.match(metrics, /buildDashboardMetricCards/);
    assert.match(metrics, /min-w-0/);
    assert.match(metrics, /break-words/);
    assert.match(metrics, /grid-cols-1/);
    assert.match(metrics, /xl:grid-cols-3/);

    const presentation = read("lib/reports/dashboard-presentation.ts");
    assert.match(presentation, /Supplies today/);
    assert.match(presentation, /Payments collected today/);
    assert.match(presentation, /Open deliveries/);
    assert.match(presentation, /Zero-stock products/);
    assert.match(presentation, /Purchases this month/);
    assert.match(presentation, /Returns this month/);
  });

  it("preserves STAFF purchase aggregates without a purchases list href", () => {
    const presentation = read("lib/reports/dashboard-presentation.ts");
    assert.match(presentation, /Purchases this month/);
    assert.match(presentation, /hrefs\.purchases/);
    // STAFF / DRIVER block keeps purchases non-linking (no list page).
    assert.match(
      presentation,
      /STAFF[\s\S]*purchases:\s*undefined[\s\S]*returns:/,
    );
  });

  it("does not change dashboard aggregation / RPC wiring for presentation", () => {
    const staff = read("app/app/staff/page.tsx");
    const admin = read("app/app/admin/page.tsx");
    assert.match(staff, /getDashboardSummary/);
    assert.match(admin, /getDashboardSummary/);
    assert.match(staff, /DashboardMetrics/);
    assert.match(admin, /DashboardMetrics/);

    const queries = read("lib/reports/queries.ts");
    assert.match(queries, /get_dashboard_summary_data|getDashboardSummary/);
  });

  it("makes report filters touch-friendly with shared control classes", () => {
    const filters = read("components/reports/ReportFilters.tsx");
    assert.match(filters, /formControlSurfaceClass/);
    assert.match(filters, /FilterActions/);
    assert.doesNotMatch(
      filters,
      /w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm/,
    );
  });

  it("presents report tables as mobile cards and desktop tables", () => {
    const cards = read("components/reports/ReportSummaryCards.tsx");
    assert.match(cards, /MobileRecordList/);
    assert.match(cards, /DesktopTableShell/);
    assert.match(cards, /RecordCard/);
    assert.match(cards, /export type ReportTableRow/);
    assert.match(cards, /break-words/);

    const page = read("app/app/reports/page.tsx");
    assert.match(page, /rows=\{/);
    assert.match(page, /ListPager/);
    assert.match(page, /buildPageHref/);
    assert.doesNotMatch(page, /<ReportTable[^>]*>\s*<tr/);
  });

  it("keeps Reports Center ADMIN-gated and RPC-backed", () => {
    const page = read("app/app/reports/page.tsx");
    assert.match(page, /requireAdmin/);
    assert.match(page, /getReportsCenterData/);
  });
});
