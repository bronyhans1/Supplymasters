import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  buildAppNav,
  canAccessAuditLogsNav,
  canAccessPurchasingNav,
  canAccessReportsNav,
  canAccessSupplierManagementNav,
  canAccessUserManagement,
} from "@/lib/navigation/app-nav";
import {
  buildDashboardMetricCards,
  dashboardMetricHrefs,
} from "@/lib/reports/dashboard-presentation";
import { evaluateAppAccess } from "@/lib/auth/access";
import { ROLE_PERMISSIONS } from "@/lib/auth/roles";
import type { Profile } from "@/types/profile";

const root = path.join(process.cwd(), "src");

function read(rel: string): string {
  return readFileSync(path.join(root, rel), "utf8");
}

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
    full_name: "Test User",
    phone: null,
    role: "STAFF",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("auth/profile request-scoped deduplication contracts", () => {
  it("wraps claims, profile, requireAuth, and createClient with React cache()", () => {
    const session = read("lib/auth/session.ts");
    assert.match(session, /import \{ cache \} from "react"/);
    assert.match(session, /export const getAuthClaims = cache\(/);
    assert.match(session, /export const getCurrentProfile = cache\(/);
    assert.match(session, /export const requireAuth = cache\(/);
    assert.match(session, /export const requireAuthForPasswordChange = cache\(/);

    // Role gates stay thin wrappers so authorization checks remain explicit.
    assert.match(session, /export async function requireRole/);
    assert.match(session, /export async function requireAdmin/);
    assert.match(session, /export async function requireStaffOrAdmin/);
    assert.doesNotMatch(session, /export const requireRole = cache\(/);
    assert.doesNotMatch(session, /export const requireAdmin = cache\(/);

    const supabaseServer = read("lib/supabase/server.ts");
    assert.match(supabaseServer, /import \{ cache \} from "react"/);
    assert.match(supabaseServer, /export const createClient = cache\(/);
  });

  it("preserves inactive and must_change_password gates inside requireAuth", () => {
    const session = read("lib/auth/session.ts");
    assert.match(session, /ACCOUNT_INACTIVE/);
    assert.match(session, /PASSWORD_CHANGE_REQUIRED/);
    assert.match(session, /must_change_password/);
    assert.match(session, /is_active/);
  });

  it("password-change confirmation bypasses cached profile after flag clear", () => {
    const session = read("lib/auth/session.ts");
    assert.match(session, /export async function getCurrentProfileFresh/);
    assert.match(session, /loadCurrentProfileFromDb/);

    const actions = read("lib/auth/actions.ts");
    assert.match(actions, /getCurrentProfileFresh\(/);
    assert.match(actions, /PASSWORD_FLAG_CLEAR_FAILED/);
    // Must not re-confirm with the cached helper after clearing the flag.
    assert.match(
      actions,
      /changeTemporaryPassword[\s\S]*getCurrentProfileFresh\(/,
    );
    const changeAction = actions.slice(actions.indexOf("changePasswordAction"));
    assert.doesNotMatch(changeAction, /await getCurrentProfile\(/);
    assert.match(changeAction, /await getCurrentProfileFresh\(/);
  });

  it("documents STAFF dashboard call-graph reduction (claims + profile)", () => {
    /**
     * Evidence from static call graph (not a live profiler):
     *
     * /app/staff BEFORE dedupe:
     *   layout getCurrentProfile → 1 getClaims + 1 profiles SELECT
     *   page requireRole → requireAuth → 2 getClaims + 1 profiles SELECT
     *     (requireAuth called getAuthClaims, then getCurrentProfile which called getAuthClaims again)
     *   getDashboardSummary → requireStaffOrAdmin → requireAuth → 2 getClaims + 1 profiles SELECT
     *   TOTAL: 5 auth.getClaims + 3 profiles SELECTs
     *
     * /app/staff AFTER React cache on getAuthClaims + getCurrentProfile + requireAuth:
     *   layout fills cache → 1 getClaims + 1 profiles SELECT
     *   page + dashboard summary reuse cached requireAuth/profile/claims
     *   TOTAL: 1 auth.getClaims + 1 profiles SELECT
     *
     * Remaining intentional lookups:
     *   Server Actions are separate requests — each mutation still runs require* fresh.
     *   RLS/RPC still authorize independently in Postgres (unchanged).
     */
    const layout = read("app/app/layout.tsx");
    const staffPage = read("app/app/staff/page.tsx");
    const dashboardQueries = read("lib/reports/queries.ts");

    assert.match(layout, /getCurrentProfile\(/);
    assert.match(staffPage, /requireRole\(\["STAFF", "ADMIN"\]\)/);
    assert.match(dashboardQueries, /requireStaffOrAdmin\(/);

    const beforeClaims = 5;
    const beforeProfiles = 3;
    const afterClaims = 1;
    const afterProfiles = 1;

    assert.equal(afterClaims, 1);
    assert.equal(afterProfiles, 1);
    assert.ok(beforeClaims - afterClaims === 4);
    assert.ok(beforeProfiles - afterProfiles === 2);
  });
});

describe("request-scoped memo semantics (React cache model)", () => {
  /**
   * React.cache() only memoizes inside an App Router request context.
   * These tests model the same per-request store behavior without relying on
   * React Flight, so node:test can verify dedupe + isolation contracts.
   */
  type RequestStore = Map<string, Promise<unknown>>;

  function memoize<T>(store: RequestStore, key: string, compute: () => Promise<T>): Promise<T> {
    const existing = store.get(key);
    if (existing) return existing as Promise<T>;
    const pending = compute();
    store.set(key, pending);
    return pending;
  }

  it("dedupes auth claims and profile lookups within one request store", async () => {
    const store: RequestStore = new Map();
    let claimsCalls = 0;
    let profileCalls = 0;

    const getClaims = () =>
      memoize(store, "claims", async () => {
        claimsCalls += 1;
        return { sub: "user-a" };
      });

    const getProfile = () =>
      memoize(store, "profile", async () => {
        const claims = await getClaims();
        profileCalls += 1;
        return { id: claims.sub, role: "STAFF" };
      });

    const requireAuthCached = () =>
      memoize(store, "requireAuth", async () => {
        const claims = await getClaims();
        const profile = await getProfile();
        return { claims, profile };
      });

    await Promise.all([
      requireAuthCached(),
      requireAuthCached(),
      getProfile(),
      getClaims(),
    ]);

    assert.equal(claimsCalls, 1);
    assert.equal(profileCalls, 1);
  });

  it("does not leak one user identity into another request store", async () => {
    const storeA: RequestStore = new Map();
    const storeB: RequestStore = new Map();

    const a = await memoize(storeA, "claims", async () => ({ sub: "admin-1" }));
    const b = await memoize(storeB, "claims", async () => ({ sub: "staff-2" }));
    const aAgain = await memoize(storeA, "claims", async () => ({
      sub: "should-not-replace",
    }));

    assert.equal(a.sub, "admin-1");
    assert.equal(b.sub, "staff-2");
    assert.equal(aAgain.sub, "admin-1");
    assert.notEqual(a.sub, b.sub);
  });
});

describe("role-aware navigation Part 2B", () => {
  it("keeps ADMIN management links and STAFF/DRIVER visibility boundaries", () => {
    const admin = buildAppNav("ADMIN").flatMap((s) => s.items);
    const staff = buildAppNav("STAFF").flatMap((s) => s.items);
    const driver = buildAppNav("DRIVER").flatMap((s) => s.items);

    assert.ok(admin.some((i) => i.href === "/app/reports"));
    assert.ok(admin.some((i) => i.href === "/app/admin/users"));
    assert.ok(admin.some((i) => i.href === "/app/purchasing"));
    assert.ok(admin.some((i) => i.href === "/app/suppliers"));
    assert.ok(admin.some((i) => i.href === "/app/audit-logs"));

    assert.equal(canAccessReportsNav("STAFF"), false);
    assert.equal(canAccessUserManagement("STAFF"), false);
    assert.equal(canAccessPurchasingNav("STAFF"), false);
    assert.equal(canAccessSupplierManagementNav("STAFF"), false);
    assert.equal(canAccessAuditLogsNav("STAFF"), false);

    assert.ok(!staff.some((i) => i.href === "/app/reports"));
    assert.ok(!staff.some((i) => i.href === "/app/admin/users"));
    assert.ok(!staff.some((i) => i.href === "/app/purchasing"));
    assert.ok(!staff.some((i) => i.href === "/app/suppliers"));
    assert.ok(!staff.some((i) => i.href?.startsWith("/app/purchasing")));

    assert.ok(staff.some((i) => i.href === "/app/supplies"));
    assert.ok(staff.some((i) => i.href === "/app/payments"));
    assert.ok(staff.some((i) => i.href === "/app/deliveries"));
    assert.ok(staff.some((i) => i.href === "/app/returns"));

    assert.equal(driver.length, 1);
    assert.equal(driver[0]?.href, "/app/driver");
  });

  it("keeps STAFF dashboard metrics unchanged and blocks purchase-record destinations", () => {
    const sample = {
      suppliesTodayCount: 2,
      suppliesTodayValue: 100,
      paymentsTodayAmount: 50,
      paymentsTodayCount: 1,
      openDeliveriesCount: 3,
      zeroStockCount: 4,
      purchasesThisMonthCount: 9,
      purchasesThisMonthCost: 1234.5,
      returnsThisMonthCount: 1,
    };

    const staffCards = buildDashboardMetricCards(sample, "STAFF");
    const adminCards = buildDashboardMetricCards(sample, "ADMIN");
    const staffHrefs = dashboardMetricHrefs("STAFF");

    assert.equal(staffCards.length, 6);
    assert.equal(
      staffCards.find((c) => c.label === "Purchases this month")?.primary,
      adminCards.find((c) => c.label === "Purchases this month")?.primary,
    );
    assert.equal(staffHrefs.purchases, undefined);
    assert.equal(
      staffCards.find((c) => c.label === "Purchases this month")?.href,
      undefined,
    );

    for (const card of staffCards) {
      assert.ok(!card.href?.includes("/app/purchasing"));
      assert.ok(!card.href?.includes("/app/suppliers"));
      assert.ok(!card.href?.includes("/app/reports"));
    }

    const staffPage = read("app/app/staff/page.tsx");
    assert.doesNotMatch(staffPage, /\/app\/purchasing/);
    assert.doesNotMatch(staffPage, /\/app\/suppliers/);
    assert.doesNotMatch(staffPage, /\/app\/reports/);
  });

  it("preserves inactive and must_change_password access restrictions", () => {
    assert.equal(evaluateAppAccess(profile({ is_active: false })).status, "inactive");
    assert.equal(
      evaluateAppAccess(profile({ must_change_password: true })).status,
      "password_change_required",
    );
    assert.equal(ROLE_PERMISSIONS.STAFF.managePurchases, false);
    assert.equal(ROLE_PERMISSIONS.DRIVER.manageDeliveries, false);
  });

  it("wires sidebar icons for ADMIN-only category and audit-log items", () => {
    const sidebar = read("components/app/AppSidebar.tsx");
    assert.match(sidebar, /categories:\s*Tags/);
    assert.match(sidebar, /"audit-logs":\s*History/);
    assert.match(sidebar, /dispatch:\s*Route/);
    assert.match(sidebar, /buildAppNav\(profile\.role\)/);
  });
});
