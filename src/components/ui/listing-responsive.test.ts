import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const LISTING_PAGES = [
  "app/app/vendors/page.tsx",
  "app/app/products/page.tsx",
  "app/app/categories/page.tsx",
  "app/app/drivers/page.tsx",
  "app/app/suppliers/page.tsx",
  "app/app/purchasing/page.tsx",
  "app/app/supplies/page.tsx",
  "app/app/returns/page.tsx",
  "app/app/inventory/page.tsx",
  "app/app/deliveries/page.tsx",
  "app/app/dispatch/page.tsx",
  "app/app/assignments/page.tsx",
  "app/app/payments/page.tsx",
  "app/app/admin/users/page.tsx",
] as const;

describe("Phase 2 Part 2 responsive listing presentation", () => {
  it("provides shared mobile card and desktop table shells", () => {
    const records = read("components/ui/ResponsiveRecords.tsx");
    assert.match(records, /export function DesktopTableShell/);
    assert.match(records, /hidden[\s\S]*lg:block/);
    assert.match(records, /export function MobileRecordList/);
    assert.match(records, /lg:hidden/);
    assert.match(records, /focus-visible:ring-2|focusRingClass/);
    assert.match(records, /export function RecordCard/);
    assert.match(records, /export function ListActionLink/);
    assert.match(records, /min-h-11/);
    assert.match(records, /variant === "card"/);
    assert.match(records, /variant === "table"|variant = "table"|variant\?: "card" \| "table"/);
  });

  it("keeps ListPager and PaginationLink touch-friendly on small screens", () => {
    const pager = read("components/ui/ListPager.tsx");
    assert.match(pager, /flex-col/);
    assert.match(pager, /sm:flex-row/);
    assert.match(pager, /min-h-11/);
    assert.match(pager, /flex-1 sm:flex-none/);

    const link = read("components/ui/PaginationLink.tsx");
    assert.match(link, /min-h-11/);
  });

  it("uses dual mobile-card / desktop-table presentation on listing pages", () => {
    for (const file of LISTING_PAGES) {
      const source = read(file);
      assert.match(
        source,
        /MobileRecordList/,
        `${file} should render MobileRecordList`,
      );
      assert.match(
        source,
        /DesktopTableShell/,
        `${file} should render DesktopTableShell`,
      );
      assert.match(
        source,
        /RecordCard/,
        `${file} should render RecordCard`,
      );
    }
  });

  it("preserves Manage/View actions on both mobile cards and desktop tables", () => {
    for (const file of LISTING_PAGES) {
      const source = read(file);
      assert.match(
        source,
        /ListActionLink/,
        `${file} should use ListActionLink`,
      );
      assert.match(
        source,
        /variant="table"/,
        `${file} should keep compact table actions`,
      );
    }
  });

  it("renders audit log rows as mobile cards plus a desktop table", () => {
    const table = read("components/audit-logs/AuditLogTable.tsx");
    assert.match(table, /MobileRecordList/);
    assert.match(table, /DesktopTableShell/);
    assert.match(table, /RecordCard/);
    assert.match(table, /min-h-11/);
  });

  it("keeps filter controls with comfortable touch targets", () => {
    const filters = [
      "components/master-data/SimpleFilters.tsx",
      "components/purchasing/PurchaseFilters.tsx",
      "components/supplies/SupplyFilters.tsx",
      "components/returns/ReturnFilters.tsx",
      "components/inventory/InventoryFilters.tsx",
      "components/deliveries/DeliveryFilters.tsx",
      "components/payments/PaymentFilters.tsx",
      "components/admin/UsersFilters.tsx",
      "components/audit-logs/AuditLogFilters.tsx",
    ];
    for (const file of filters) {
      assert.match(
        read(file),
        /\[&_input\]:min-h-11/,
        `${file} should enlarge inputs for touch`,
      );
    }

    const actions = read("components/ui/FilterActions.tsx");
    assert.match(actions, /min-h-11/);
  });
});
