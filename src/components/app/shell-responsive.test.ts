import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Phase 2 Part 1 application shell responsiveness", () => {
  it("stacks mobile chrome above content and keeps desktop sidebar from xl", () => {
    const shell = read("components/app/AppShell.tsx");
    assert.match(shell, /flex-col/);
    assert.match(shell, /xl:flex-row/);
    assert.match(shell, /min-w-0/);
    assert.match(shell, /NavigationProgressProvider/);
    assert.doesNotMatch(shell, /\blg:flex-row\b/);
  });

  it("keeps a full-width sticky mobile header and drawer below xl", () => {
    const sidebar = read("components/app/AppSidebar.tsx");
    assert.match(sidebar, /<header/);
    assert.match(sidebar, /w-full/);
    assert.match(sidebar, /sticky top-0/);
    assert.match(sidebar, /xl:hidden/);
    assert.match(sidebar, /role="dialog"/);
    assert.match(sidebar, /aria-modal=\{mobileOpen\}/);
    assert.match(sidebar, /aria-expanded=\{mobileOpen\}/);
    assert.match(sidebar, /safe-area-inset/);
    assert.match(sidebar, /document\.body\.style\.overflow/);
    assert.match(sidebar, /Escape/);
    assert.match(sidebar, /popstate/);
    assert.match(sidebar, /setMobileOpen\(false\)/);
    assert.match(sidebar, /touchFriendly/);
    assert.match(sidebar, /min-h-11/);
    assert.match(sidebar, /hidden h-screen[\s\S]*xl:flex/);
    assert.doesNotMatch(sidebar, /\blg:hidden\b/);
    assert.doesNotMatch(sidebar, /\blg:flex\b/);
  });

  it("animates the mobile drawer without remounting the brand lockup", () => {
    const sidebar = read("components/app/AppSidebar.tsx");
    assert.match(sidebar, /translate-x-0/);
    assert.match(sidebar, /-translate-x-full/);
    assert.match(sidebar, /transition-transform/);
    assert.match(sidebar, /transition-opacity/);
    assert.match(sidebar, /motion-reduce:transition-none/);
    assert.match(sidebar, /BrandLockup height=\{32\} priority/);
    assert.match(
      sidebar,
      /id=\{drawerTitleId\}[\s\S]*?<BrandLockup height=\{32\} \/>/,
    );
    assert.doesNotMatch(
      sidebar,
      /hidden h-screen[\s\S]*xl:flex[\s\S]*BrandLockup[\s\S]*priority/,
    );
    // Drawer stays mounted (no conditional unmount) to avoid logo flicker.
    assert.doesNotMatch(sidebar, /mobileOpen \? \([\s\S]*BrandLockup[\s\S]*\) : null/);
  });

  it("closes the drawer on navigate, including the current route", () => {
    const sidebar = read("components/app/AppSidebar.tsx");
    assert.match(sidebar, /onNavigate\?\.\(\)/);
    assert.match(sidebar, /if \(active\) \{\s*event\.preventDefault\(\);\s*return;/);
    // onNavigate is invoked before the active short-circuit.
    const onNavigateBlock = sidebar.slice(
      sidebar.indexOf("onNavigate={(event) => {"),
      sidebar.indexOf("begin();") + "begin();".length,
    );
    assert.match(onNavigateBlock, /onNavigate\?\.\(\)/);
    assert.match(onNavigateBlock, /if \(active\)/);
  });

  it("preserves sidebar pending feedback and navigation progress begin()", () => {
    const sidebar = read("components/app/AppSidebar.tsx");
    assert.match(sidebar, /useLinkStatus/);
    assert.match(sidebar, /showPending = pending && !active/);
    assert.match(sidebar, /begin\(\)/);
  });

  it("provides a responsive PageHeader for title and actions", () => {
    const header = read("components/app/PageHeader.tsx");
    assert.match(header, /export function PageHeader/);
    assert.match(header, /flex-col/);
    assert.match(header, /sm:flex-row/);
    assert.match(header, /actions/);

    const wired = [
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
      "app/app/payments/page.tsx",
    ];
    for (const file of wired) {
      assert.match(
        read(file),
        /PageHeader/,
        `${file} should use PageHeader`,
      );
    }
  });
});
