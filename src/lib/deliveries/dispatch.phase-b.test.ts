import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  canManageDeliveryAssignments,
  roleCanManageDeliveryAssignments,
} from "@/lib/deliveries/authorization";
import {
  deliveryAssignmentStateLabel,
  filterAssignmentStateOptions,
} from "@/lib/deliveries/presentation";
import { listDeliveriesQuerySchema } from "@/lib/deliveries/schemas";
import { ROLE_PERMISSIONS } from "@/lib/auth/roles";
import type { Profile } from "@/types/profile";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "user@example.com",
    full_name: "User",
    phone: null,
    role: "STAFF",
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Phase B — Dispatch & Assignments workspace", () => {
  const nav = read("src/lib/navigation/app-nav.ts");
  const sidebar = read("src/components/app/AppSidebar.tsx");
  const dispatchPage = read("src/app/app/dispatch/page.tsx");
  const assignPage = read("src/app/app/dispatch/[deliveryId]/page.tsx");
  const deliveriesPage = read("src/app/app/deliveries/page.tsx");
  const actions = read("src/lib/deliveries/actions.ts");
  const queries = read("src/lib/deliveries/queries.ts");
  const schemas = read("src/lib/deliveries/schemas.ts");

  it("gates dispatch route and nav to ADMIN assignment permission", () => {
    assert.equal(ROLE_PERMISSIONS.ADMIN.manageDeliveryAssignments, true);
    assert.equal(ROLE_PERMISSIONS.STAFF.manageDeliveryAssignments, false);
    assert.equal(ROLE_PERMISSIONS.DRIVER.manageDeliveryAssignments, false);
    assert.equal(canManageDeliveryAssignments(profile({ role: "ADMIN" })), true);
    assert.equal(canManageDeliveryAssignments(profile({ role: "STAFF" })), false);
    assert.equal(roleCanManageDeliveryAssignments("DRIVER"), false);

    assert.match(nav, /canAccessDispatchNav/);
    assert.match(nav, /manageDeliveryAssignments/);
    assert.match(nav, /href: "\/app\/dispatch"/);
    assert.match(nav, /Dispatch & Assignments/);
    assert.match(sidebar, /dispatch:\s*Route/);

    assert.match(dispatchPage, /await requireAdmin\(\)/);
    assert.match(assignPage, /await requireAdmin\(\)/);
    assert.match(dispatchPage, /listDispatchDeliveries/);
    assert.doesNotMatch(dispatchPage, /requireStaffOrAdmin/);
  });

  it("keeps assignment forms only on ADMIN Dispatch desk, not delivery detail", () => {
    const detailPage = read("src/app/app/deliveries/[deliveryId]/page.tsx");
    assert.match(assignPage, /AssignStaffForm/);
    assert.match(assignPage, /AssignDriverForm/);
    assert.match(assignPage, /await requireAdmin\(\)/);
    assert.match(assignPage, /Status stays[\s\S]*unchanged|stay the same|never change/i);
    assert.doesNotMatch(detailPage, /AssignStaffForm|AssignDriverForm/);
    assert.match(detailPage, /Responsible staff/);
    assert.match(detailPage, /Assigned driver/);
    assert.match(detailPage, /UpdateStatusForm/);
    assert.match(actions, /revalidatePath\("\/app\/dispatch"\)/);
    assert.match(actions, /revalidatePath\(`\/app\/dispatch\/\$\{delivery\.id\}`\)/);

    const driverAction = actions.match(
      /export async function assignDeliveryDriver\([\s\S]*?\n\}/,
    )?.[0];
    const staffAction = actions.match(
      /export async function assignDeliveryResponsibleStaff\([\s\S]*?\n\}/,
    )?.[0];
    const statusAction = actions.match(
      /export async function updateDeliveryStatusAction\([\s\S]*?\n\}/,
    )?.[0];
    assert.ok(driverAction);
    assert.ok(staffAction);
    assert.ok(statusAction);
    assert.match(driverAction, /requireAdmin\(\)/);
    assert.match(staffAction, /requireAdmin\(\)/);
    assert.match(statusAction, /requireStaffOrAdmin\(\)/);
    assert.doesNotMatch(driverAction, /update_delivery_status/);
    assert.doesNotMatch(staffAction, /update_delivery_status/);
  });

  it("supports assignment-state filters and keeps multi-assignment unrestricted", () => {
    assert.match(schemas, /NEEDS_DRIVER/);
    assert.match(schemas, /HAS_DRIVER/);
    assert.match(queries, /assignmentState === "NEEDS_DRIVER"/);
    assert.match(queries, /assignmentState === "HAS_DRIVER"/);

    const parsed = listDeliveriesQuerySchema.parse({
      assignmentState: "NEEDS_DRIVER",
    });
    assert.equal(parsed.assignmentState, "NEEDS_DRIVER");

    assert.deepEqual(
      filterAssignmentStateOptions().map((o) => o.value),
      ["", "NEEDS_DRIVER", "HAS_DRIVER"],
    );
    assert.equal(
      deliveryAssignmentStateLabel({ status: "PENDING", driverId: null }),
      "Needs driver",
    );
    assert.equal(
      deliveryAssignmentStateLabel({
        status: "DISPATCHED",
        driverId: "22222222-2222-4222-8222-222222222222",
      }),
      "Driver assigned",
    );
    assert.equal(
      deliveryAssignmentStateLabel({ status: "DELIVERED", driverId: null }),
      "No driver (locked)",
    );

    assert.match(
      dispatchPage,
      /Multiple deliveries may share the same[\s\S]*staff member or driver/,
    );
    assert.doesNotMatch(dispatchPage, /conflict|overlap|one-delivery/i);
    assert.doesNotMatch(assignPage, /conflict|overlap/i);
  });

  it("keeps STAFF delivery filters working via listStaffForFilter", () => {
    assert.match(queries, /export async function listStaffForFilter/);
    assert.match(
      queries,
      /export async function listStaffForFilter\([\s\S]*?await requireStaffOrAdmin\(\)/,
    );
    assert.match(
      queries,
      /export async function listEligibleStaffForAssignment\([\s\S]*?await requireAdmin\(\)/,
    );
    assert.match(deliveriesPage, /listStaffForFilter/);
    assert.doesNotMatch(deliveriesPage, /listEligibleStaffForAssignment/);
  });

  it("ships responsive dispatch listing and loading shells", () => {
    assert.match(dispatchPage, /MobileRecordList/);
    assert.match(dispatchPage, /DesktopTableShell/);
    assert.match(dispatchPage, /RecordCard/);
    assert.match(dispatchPage, /ListActionLink/);
    assert.match(dispatchPage, /xl:grid-cols-4/);
    assert.match(read("src/app/app/dispatch/loading.tsx"), /Loading dispatch workspace/);
    assert.match(
      read("src/app/app/dispatch/[deliveryId]/loading.tsx"),
      /Loading assignment desk/,
    );
  });

  it("does not introduce assignment history migrations", () => {
    assert.doesNotMatch(dispatchPage, /delivery_assignments/);
    assert.doesNotMatch(assignPage, /delivery_assignments/);
    assert.doesNotMatch(actions, /delivery_assignments/);
  });
});
