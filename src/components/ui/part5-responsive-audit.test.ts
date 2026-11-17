import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Phase 2 Part 5 tablet and polish refinements", () => {
  it("keeps record cards through tablet widths and tables from lg", () => {
    const records = read("components/ui/ResponsiveRecords.tsx");
    assert.match(records, /lg:block/);
    assert.match(records, /lg:hidden/);
    assert.doesNotMatch(records, /\bmd:block\b/);
    assert.doesNotMatch(records, /\bmd:hidden\b/);
  });

  it("keeps pagination touch targets through tablet, compact only at xl", () => {
    const link = read("components/ui/PaginationLink.tsx");
    assert.match(link, /min-h-11/);
    assert.match(link, /xl:min-h-0/);
    assert.doesNotMatch(link, /sm:min-h-0/);
    assert.match(link, /focus-visible:ring-2/);
  });

  it("gives report filter actions a full row until xl", () => {
    const filters = read("components/reports/ReportFilters.tsx");
    assert.match(filters, /md:col-span-2 xl:col-span-3/);
  });

  it("avoids five-column delivery summaries before xl", () => {
    const deliveries = read("app/app/deliveries/page.tsx");
    assert.match(deliveries, /xl:grid-cols-5/);
    assert.doesNotMatch(deliveries, /lg:grid-cols-5/);
    assert.match(deliveries, /min-w-0/);
  });

  it("preserves drawer motion, FormDialog scroll, and createUuid", () => {
    const sidebar = read("components/app/AppSidebar.tsx");
    assert.match(sidebar, /transition-transform/);
    assert.match(sidebar, /motion-reduce:transition-none/);
    // Mobile header keeps priority; drawer/desktop lockups do not.
    assert.match(sidebar, /BrandLockup height=\{32\} priority/);
    assert.match(
      sidebar,
      /id=\{drawerTitleId\}[\s\S]*?<BrandLockup height=\{32\} \/>/,
    );

    const dialog = read("components/ui/FormDialog.tsx");
    assert.match(dialog, /overflow-y-auto/);
    assert.match(dialog, /max-h-\[90dvh\]/);
    assert.match(dialog, /position = "fixed"/);

    assert.match(read("lib/utils/id.ts"), /export function createUuid/);
    assert.doesNotMatch(read("components/purchasing/PurchaseForm.tsx"), /crypto\.randomUUID/);
    assert.doesNotMatch(read("components/supplies/SupplyForm.tsx"), /crypto\.randomUUID/);
  });

  it("adds focus-visible rings on key chrome controls", () => {
    assert.match(read("components/app/AppSidebar.tsx"), /focus-visible:ring-2/);
    assert.match(read("components/ui/FormDialog.tsx"), /focus-visible:ring-2/);
    assert.match(read("components/ui/ConfirmDialog.tsx"), /focus-visible:ring-2/);
    assert.match(read("components/ui/ResponsiveRecords.tsx"), /focusRingClass|focus-visible:ring-2/);
  });
});
