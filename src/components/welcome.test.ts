import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "src");

describe("public welcome page", () => {
  it("links to staff sign-in and omits API diagnostic", () => {
    const hero = readFileSync(join(root, "components/WelcomeHero.tsx"), "utf8");
    const page = readFileSync(join(root, "app/(marketing)/page.tsx"), "utf8");

    assert.match(hero, /href="\/sign-in"/);
    assert.match(hero, /Staff Sign In/);
    assert.doesNotMatch(hero, /API connected|ServiceStatus|useApiHealth/);
    assert.match(page, /WelcomeHero/);
    assert.doesNotMatch(page, /ServiceStatus|HomeHero|useApiHealth/);
  });

  it("does not introduce public registration", () => {
    const hero = readFileSync(join(root, "components/WelcomeHero.tsx"), "utf8");
    const signIn = readFileSync(join(root, "components/auth/SignInForm.tsx"), "utf8");
    assert.match(hero, /Public registration is not available/);
    assert.match(signIn, /Public registration is not available/);
    assert.doesNotMatch(hero, /Sign up|Create account|Register/i);
  });
});

describe("Phase H login branding and versioning", () => {
  it("shows version and HADRO attribution on the login experience only", () => {
    const brand = readFileSync(join(root, "config/brand.ts"), "utf8");
    const signInExperience = readFileSync(
      join(root, "components/auth/SignInExperience.tsx"),
      "utf8",
    );
    const sidebar = readFileSync(join(root, "components/app/AppSidebar.tsx"), "utf8");
    const adminDashboard = readFileSync(join(root, "app/app/admin/page.tsx"), "utf8");
    const staffDashboard = readFileSync(join(root, "app/app/staff/page.tsx"), "utf8");

    assert.match(brand, /APP_VERSION = "v1\.0\.0"/);
    assert.match(brand, /APP_POWERED_BY = "Powered by HADRO Technologies"/);
    assert.match(signInExperience, /APP_VERSION/);
    assert.match(signInExperience, /APP_POWERED_BY/);
    assert.doesNotMatch(sidebar, /APP_VERSION|v1\.0\.0|HADRO/);
    assert.doesNotMatch(adminDashboard, /APP_VERSION|v1\.0\.0|HADRO/);
    assert.doesNotMatch(staffDashboard, /APP_VERSION|v1\.0\.0|HADRO/);
  });
});

describe("user-facing terminology", () => {
  it("does not expose admin RPC names in the manage panel", () => {
    const panel = readFileSync(
      join(root, "components/admin/UserManagePanel.tsx"),
      "utf8",
    );
    assert.doesNotMatch(panel, /admin_set_user_role|admin_require_password_change/);
    assert.match(panel, /Manage this user/);
  });

  it("keeps sign-in password free of new-password minLength", () => {
    const signIn = readFileSync(join(root, "components/auth/SignInForm.tsx"), "utf8");
    const field = readFileSync(join(root, "components/auth/PasswordField.tsx"), "utf8");
    assert.doesNotMatch(signIn, /minLength=\{8\}|minLength=\{NEW_PASSWORD/);
    assert.match(field, /Omit for sign-in/);
  });
});
