import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");
const appRoot = join(root, "app", "app");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function loadingExists(relFromApp: string) {
  return existsSync(join(appRoot, relFromApp, "loading.tsx"));
}

describe("loading and duplicate-submit patterns", () => {
  it("exposes reusable loading UI modules", () => {
    assert.ok(
      read("components/ui/LoadingSpinner.tsx").includes(
        "motion-reduce:animate-none",
      ),
    );
    const loadingButton = read("components/ui/LoadingButton.tsx");
    assert.ok(loadingButton.includes("pendingLabel"));
    assert.ok(loadingButton.includes("opacity-0"));
    assert.ok(loadingButton.includes("inline-grid"));

    const skeletons = read("components/ui/TableSkeleton.tsx");
    assert.match(skeletons, /export function TableSkeleton/);
    assert.match(skeletons, /export function PageHeaderSkeleton/);
    assert.match(skeletons, /export function CardSkeleton/);
    assert.match(skeletons, /export function FilterPanelSkeleton/);
    assert.match(skeletons, /export function MetricCardsSkeleton/);
    assert.match(skeletons, /export function MasterRecordSkeleton/);
    assert.match(skeletons, /export function DocumentRecordSkeleton/);
    assert.match(skeletons, /export function FormPageSkeleton/);
    assert.match(skeletons, /motion-reduce:animate-none/);
  });

  it("guards product and user create forms against duplicate submits", () => {
    const productForms = read("components/master-data/ProductForms.tsx");
    const createUser = read("components/admin/CreateUserForm.tsx");
    const helper = read("components/navigation/create-success.ts");
    assert.match(productForms, /runWrite\(/);
    assert.match(createUser, /runWrite\(/);
    assert.match(helper, /lockRef/);
    assert.match(productForms, /LoadingButton/);
    assert.match(createUser, /Generate password/);
    assert.match(createUser, /Show password|Hide password/);
    assert.match(createUser, /Creating account…/);
  });
});

describe("Phase I Part 1 essential loading coverage", () => {
  it("provides dashboard skeletons and keeps detail/create loaders", () => {
    assert.equal(loadingExists("admin"), true);
    assert.equal(loadingExists("staff"), true);
    assert.equal(loadingExists("driver"), true);

    assert.match(read("app/app/admin/loading.tsx"), /MetricCardsSkeleton/);
    assert.match(read("app/app/staff/loading.tsx"), /MetricCardsSkeleton/);
    assert.match(read("app/app/driver/loading.tsx"), /PageHeaderSkeleton/);
  });

  it("covers missing detail and create-page loading routes", () => {
    const detailRoutes = [
      "products/[productId]",
      "categories/[categoryId]",
      "vendors/[vendorId]",
      "suppliers/[supplierId]",
      "admin/users/[userId]",
      "inventory/[productId]",
      "purchasing/[purchaseId]",
      "supplies/[supplyId]",
    ];
    for (const route of detailRoutes) {
      assert.equal(loadingExists(route), true, `missing loading for ${route}`);
    }

    assert.equal(loadingExists("purchasing/new"), true);
    assert.equal(loadingExists("supplies/new"), true);
    assert.equal(loadingExists("returns/new"), true);

    assert.match(
      read("app/app/products/[productId]/loading.tsx"),
      /MasterRecordSkeleton/,
    );
    assert.match(
      read("app/app/purchasing/[purchaseId]/loading.tsx"),
      /DocumentRecordSkeleton/,
    );
    assert.match(
      read("app/app/purchasing/new/loading.tsx"),
      /FormPageSkeleton/,
    );
  });

  it("leaves existing delivery/payment/driver/return detail loaders in place", () => {
    assert.equal(loadingExists("deliveries/[deliveryId]"), true);
    assert.equal(loadingExists("payments/[paymentId]"), true);
    assert.equal(loadingExists("drivers/[driverId]"), true);
    assert.equal(loadingExists("returns/[returnId]"), true);
    assert.equal(loadingExists("dispatch"), true);
    assert.equal(loadingExists("dispatch/[deliveryId]"), true);
  });
});

describe("Phase I Part 2 navigation and interaction polish", () => {
  it("implements App Router navigation progress without router events", () => {
    const progress = read("components/navigation/NavigationProgress.tsx");
    assert.match(progress, /NavigationProgressProvider/);
    assert.match(progress, /useNavigationProgress/);
    assert.match(progress, /begin/);
    assert.match(progress, /startedRef/);
    assert.match(progress, /popstate/);
    assert.match(progress, /prefers-reduced-motion|nav-progress-bar-active/);
    assert.doesNotMatch(progress, /router\.events|routeChangeStart/);

    const shell = read("components/app/AppShell.tsx");
    assert.match(shell, /NavigationProgressProvider/);

    const css = read("app/globals.css");
    assert.match(css, /nav-progress-bar-active/);
    assert.match(css, /prefers-reduced-motion/);
  });

  it("gives sidebar pending feedback via useLinkStatus without marking active routes", () => {
    const sidebar = read("components/app/AppSidebar.tsx");
    assert.match(sidebar, /useLinkStatus/);
    assert.match(sidebar, /showPending = pending && !active/);
    assert.match(sidebar, /event\.preventDefault\(\)/);
    assert.match(sidebar, /begin\(\)/);
  });

  it("uses shared filter actions with pending guards across filter forms", () => {
    assert.match(read("components/ui/FilterActions.tsx"), /LoadingButton/);
    assert.match(read("components/ui/FilterActions.tsx"), /Filtering…/);

    const filters = [
      "components/master-data/SimpleFilters.tsx",
      "components/audit-logs/AuditLogFilters.tsx",
      "components/admin/UsersFilters.tsx",
      "components/inventory/InventoryFilters.tsx",
      "components/deliveries/DeliveryFilters.tsx",
      "components/deliveries/DispatchFilters.tsx",
      "components/payments/PaymentFilters.tsx",
      "components/purchasing/PurchaseFilters.tsx",
      "components/supplies/SupplyFilters.tsx",
      "components/returns/ReturnFilters.tsx",
      "components/reports/ReportFilters.tsx",
    ];
    for (const file of filters) {
      const source = read(file);
      assert.match(source, /FilterActions/, `${file} should use FilterActions`);
      assert.match(source, /aria-busy=\{pending\}/, `${file} should set aria-busy`);
      assert.match(source, /if \(pending\) return/, `${file} should guard duplicate submits`);
    }
  });

  it("uses PaginationLink pending feedback and drops list-level loading skeletons", () => {
    const pagination = read("components/ui/PaginationLink.tsx");
    assert.match(pagination, /useLinkStatus/);
    assert.match(pagination, /begin\(\)/);
    assert.doesNotMatch(pagination, /export function buildPageHref/);

    assert.match(
      read("lib/navigation/pagination.ts"),
      /export function buildPageHref/,
    );
    assert.doesNotMatch(
      read("lib/navigation/pagination.ts"),
      /^["']use client["']/m,
    );
    assert.match(
      read("app/app/audit-logs/page.tsx"),
      /from "@\/lib\/navigation\/pagination"/,
    );

    assert.match(read("components/ui/ListPager.tsx"), /PaginationLink/);
    assert.match(read("app/app/products/page.tsx"), /ListPager|PaginationLink/);
    assert.match(read("app/app/purchasing/page.tsx"), /ListPager|PaginationLink/);

    const listRoutesWithoutLoading = [
      "products",
      "categories",
      "vendors",
      "suppliers",
      "drivers",
      "inventory",
      "purchasing",
      "supplies",
      "payments",
      "deliveries",
      "returns",
      "admin/users",
      "audit-logs",
      "reports",
    ];
    for (const route of listRoutesWithoutLoading) {
      assert.equal(
        loadingExists(route),
        false,
        `${route} list loading.tsx should be removed for filter stability`,
      );
    }
  });
});
