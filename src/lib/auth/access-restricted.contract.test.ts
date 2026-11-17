import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildAppNav } from "@/lib/navigation/app-nav";
import {
  buildDashboardMetricCards,
  dashboardMetricHrefs,
} from "@/lib/reports/dashboard-presentation";

const root = path.join(process.cwd(), "src");

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("Access Restricted authorization UX", () => {
  it("requireRole uses forbidden() instead of throwing AppError FORBIDDEN", () => {
    const session = read("lib/auth/session.ts");
    assert.match(session, /from "next\/navigation"/);
    assert.match(session, /forbidden\(\)/);
    assert.doesNotMatch(
      session,
      /throw new AppError\(\s*403,\s*["']FORBIDDEN["']/,
    );
  });

  it("enables authInterrupts and provides Access Restricted under /app", () => {
    const nextConfig = readFileSync(
      path.join(process.cwd(), "next.config.ts"),
      "utf8",
    );
    assert.match(nextConfig, /authInterrupts:\s*true/);

    const forbiddenPage = read("app/app/forbidden.tsx");
    assert.match(forbiddenPage, /AccessRestricted/);
    assert.match(forbiddenPage, /roleHomePath/);

    const accessUi = read("components/app/AccessRestricted.tsx");
    assert.match(accessUi, /Access Restricted/);
    assert.match(
      accessUi,
      /You don&apos;t have permission to access this page/,
    );
    assert.match(accessUi, /Return to dashboard/);

    const errorBoundary = read("app/app/error.tsx");
    assert.match(errorBoundary, /isAuthorizationError/);
    assert.match(errorBoundary, /AccessRestricted/);
    assert.match(errorBoundary, /Unable to load this page/);
  });

  it("preserves ADMIN nav to admin-only pages and STAFF denial of those destinations", () => {
    const adminNav = buildAppNav("ADMIN");
    const staffNav = buildAppNav("STAFF");
    const adminHrefs = adminNav.flatMap((s) => s.items.map((i) => i.href));
    const staffHrefs = staffNav.flatMap((s) => s.items.map((i) => i.href));

    for (const href of [
      "/app/reports",
      "/app/purchasing",
      "/app/drivers",
      "/app/suppliers",
      "/app/categories",
      "/app/audit-logs",
      "/app/admin/users",
    ]) {
      assert.ok(adminHrefs.includes(href), `ADMIN missing ${href}`);
      assert.ok(!staffHrefs.includes(href), `STAFF should not link to ${href}`);
    }

    for (const href of [
      "/app/supplies",
      "/app/payments",
      "/app/deliveries",
      "/app/returns",
      "/app/inventory",
      "/app/vendors",
      "/app/products",
    ]) {
      assert.ok(staffHrefs.includes(href), `STAFF missing ${href}`);
    }
  });

  it("keeps ADMIN report drill-downs and routes STAFF metrics to operational pages", () => {
    const admin = dashboardMetricHrefs("ADMIN");
    const staff = dashboardMetricHrefs("STAFF");

    assert.equal(admin.supplies, "/app/reports?period=today&section=supplies");
    assert.equal(admin.payments, "/app/reports?period=today&section=payments");
    assert.equal(
      admin.purchases,
      "/app/reports?period=this_month&section=purchasing",
    );
    assert.equal(admin.returns, "/app/reports?period=this_month&section=returns");

    assert.equal(staff.supplies, "/app/supplies");
    assert.equal(staff.payments, "/app/payments");
    assert.equal(staff.returns, "/app/returns");
    assert.equal(staff.purchases, undefined);
    assert.equal(staff.openDeliveries, admin.openDeliveries);
    assert.equal(staff.zeroStock, admin.zeroStock);

    const sample = {
      suppliesTodayCount: 1,
      suppliesTodayValue: 10,
      paymentsTodayAmount: 5,
      paymentsTodayCount: 1,
      openDeliveriesCount: 2,
      zeroStockCount: 1,
      purchasesThisMonthCount: 7,
      purchasesThisMonthCost: 4590,
      returnsThisMonthCount: 3,
    };
    const staffCards = buildDashboardMetricCards(sample, "STAFF");
    const adminCards = buildDashboardMetricCards(sample, "ADMIN");

    assert.equal(staffCards.length, 6);
    assert.equal(adminCards.length, 6);
    assert.equal(
      staffCards.find((c) => c.label === "Purchases this month")?.primary,
      adminCards.find((c) => c.label === "Purchases this month")?.primary,
    );
    assert.equal(
      staffCards.find((c) => c.label === "Purchases this month")?.href,
      undefined,
    );
  });

  it("action failure helpers rethrow Next control-flow errors", () => {
    const files = [
      "lib/master-data/action-result.ts",
      "lib/purchasing/actions.ts",
      "lib/returns/actions.ts",
      "lib/deliveries/actions.ts",
      "lib/supplies/actions.ts",
      "lib/inventory/actions.ts",
      "lib/auth/actions.ts",
      "lib/admin/users/actions.ts",
    ];
    for (const file of files) {
      assert.match(
        read(file),
        /rethrowNextControlFlow/,
        `${file} must rethrow forbidden/redirect`,
      );
    }
  });
});
