import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("brand lockup single-line wordmark", () => {
  it("keeps SUPPLY MASTERS on one line without an explicit break", () => {
    const lockup = read("components/brand/BrandMark.tsx");
    assert.match(lockup, /APP_NAME/);
    assert.match(lockup, /whitespace-nowrap/);
    assert.doesNotMatch(lockup, /<br\s*\/?>/);
    // Text column must not shrink under a parent min-w-0 flex item.
    assert.match(lockup, /shrink-0/);
    assert.doesNotMatch(
      lockup,
      /<span className="min-w-0">[\s\S]*APP_NAME/,
    );
  });

  it("keeps the desktop sidebar permanently expanded with BrandLockup", () => {
    const sidebar = read("components/app/AppSidebar.tsx");
    assert.match(sidebar, /BrandLockup/);
    assert.match(sidebar, /w-64/);
    assert.doesNotMatch(sidebar, /collapsed|setCollapsed|PanelLeftClose|PanelLeftOpen/);
    assert.doesNotMatch(sidebar, /Collapse sidebar|Expand sidebar/);
    assert.doesNotMatch(sidebar, /w-\[4\.5rem\]/);
  });
});

describe("loading feedback polish", () => {
  it("keeps navigation progress as the sole global route indicator", () => {
    const progress = read("components/navigation/NavigationProgress.tsx");
    assert.match(progress, /nav-progress-bar-active/);
    assert.match(progress, /bg-accent/);
    assert.doesNotMatch(progress, /fixed inset-0.*Spinner|LoadingOverlay/);
  });

  it("shows pending chrome and a LogOut icon on SignOutButton", () => {
    const signOut = read("components/auth/SignOutButton.tsx");
    assert.match(signOut, /aria-busy=\{pending\}/);
    assert.match(signOut, /Signing out…/);
    assert.match(signOut, /animate-spin/);
    assert.match(signOut, /if \(pending\) return/);
    assert.match(signOut, /LogOut/);
    assert.match(signOut, /pending \? \([\s\S]*animate-spin[\s\S]*LogOut/);

    const button = read("components/ui/LoadingButton.tsx");
    assert.match(button, /aria-busy=\{pending\}/);
    assert.match(button, /animate-spin/);
    assert.match(button, /opacity-100/);
  });

  it("preserves intentional absence of list-level loading skeletons", () => {
    const appRoot = join(root, "app", "app");
    for (const route of ["products", "vendors", "reports", "payments"]) {
      assert.equal(
        existsSync(join(appRoot, route, "loading.tsx")),
        false,
        `${route} must stay without list loading.tsx for filter stability`,
      );
    }
  });
});
