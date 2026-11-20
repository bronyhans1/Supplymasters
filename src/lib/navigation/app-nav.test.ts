import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAppNav,
  canAccessMasterData,
  canAccessOperations,
  canAccessUserManagement,
  isNavItemActive,
} from "@/lib/navigation/app-nav";

describe("buildAppNav", () => {
  it("gives admins master data, operations, reports, and user management", () => {
    const sections = buildAppNav("ADMIN");
    const items = sections.flatMap((s) => s.items);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes("Products"));
    assert.ok(labels.includes("Product Categories"));
    assert.ok(labels.includes("Vendors"));
    assert.ok(labels.includes("Stock Suppliers"));
    assert.ok(labels.includes("Drivers"));

    const categories = items.find((i) => i.id === "categories");
    assert.equal(categories?.href, "/app/categories");
    assert.equal(categories?.available, true);
    assert.ok(labels.includes("Deliveries"));
    assert.ok(labels.includes("Purchasing"));
    assert.ok(labels.includes("User Management"));
    assert.ok(labels.includes("Reports"));
    assert.ok(labels.includes("Activity History"));

    const users = items.find((i) => i.id === "users");
    assert.equal(users?.available, true);

    const auditLogs = items.find((i) => i.id === "audit-logs");
    assert.equal(auditLogs?.available, true);
    assert.equal(auditLogs?.href, "/app/audit-logs");

    const purchasing = items.find((i) => i.id === "purchasing");
    assert.equal(purchasing?.available, true);
    assert.equal(purchasing?.href, "/app/purchasing");

    const inventory = items.find((i) => i.id === "inventory");
    assert.equal(inventory?.available, true);

    const supplies = items.find((i) => i.id === "supplies");
    assert.equal(supplies?.available, true);

    const drivers = items.find((i) => i.id === "drivers");
    assert.equal(drivers?.href, "/app/drivers");
    assert.equal(drivers?.available, true);

    const deliveries = items.find((i) => i.id === "deliveries");
    assert.equal(deliveries?.href, "/app/deliveries");
    assert.equal(deliveries?.available, true);

    const dispatch = items.find((i) => i.id === "dispatch");
    assert.equal(dispatch?.href, "/app/dispatch");
    assert.equal(dispatch?.available, true);
    assert.equal(dispatch?.label, "Dispatch");

    const assignments = items.find((i) => i.id === "assignments");
    assert.equal(assignments?.href, "/app/assignments");
    assert.equal(assignments?.available, true);
    assert.equal(assignments?.label, "Assignments");

    const payments = items.find((i) => i.id === "payments");
    assert.equal(payments?.href, "/app/payments");
    assert.equal(payments?.available, true);

    const returns = items.find((i) => i.id === "returns");
    assert.equal(returns?.href, "/app/returns");
    assert.equal(returns?.available, true);

    const reports = items.find((i) => i.id === "reports");
    assert.equal(reports?.href, "/app/reports");
    assert.equal(reports?.available, true);

    const operations = sections.find((s) => s.id === "operations");
    const opLabels = (operations?.items ?? []).map((i) => i.label);
    const supplyIdx = opLabels.indexOf("Supplies");
    const dispatchIdx = opLabels.indexOf("Dispatch");
    const assignmentsIdx = opLabels.indexOf("Assignments");
    const paymentsIdx = opLabels.indexOf("Payments");
    const deliveriesIdx = opLabels.indexOf("Deliveries");
    assert.ok(supplyIdx < dispatchIdx);
    assert.ok(dispatchIdx < assignmentsIdx);
    assert.ok(assignmentsIdx < paymentsIdx);
    assert.ok(paymentsIdx < deliveriesIdx);
    assert.equal(labels.includes("Dispatch & Assignments"), false);
  });

  it("hides ADMIN-only modules from staff while keeping operational routes", () => {
    const sections = buildAppNav("STAFF");
    const items = sections.flatMap((s) => s.items);
    const labels = items.map((i) => i.label);
    assert.ok(labels.includes("Products"));
    assert.ok(labels.includes("Vendors"));
    assert.ok(labels.includes("Inventory"));
    assert.ok(labels.includes("Supplies"));
    assert.ok(labels.includes("Payments"));
    assert.ok(labels.includes("Deliveries"));
    assert.ok(labels.includes("Returns"));
    assert.equal(labels.includes("Dispatch"), false);
    assert.equal(labels.includes("Assignments"), false);
    assert.equal(labels.includes("Dispatch & Assignments"), false);
    assert.equal(labels.includes("User Management"), false);
    assert.equal(labels.includes("Product Categories"), false);
    assert.equal(labels.includes("Stock Suppliers"), false);
    assert.equal(labels.includes("Drivers"), false);
    assert.equal(labels.includes("Purchasing"), false);
    assert.equal(labels.includes("Reports"), false);
    assert.equal(labels.includes("Activity History"), false);
    assert.equal(
      items.some((i) => i.id === "audit-logs" || i.href === "/app/audit-logs"),
      false,
    );

    const deliveries = items.find((i) => i.id === "deliveries");
    assert.equal(deliveries?.href, "/app/deliveries");
    assert.equal(deliveries?.available, true);

    const payments = items.find((i) => i.id === "payments");
    assert.equal(payments?.href, "/app/payments");
    assert.equal(payments?.available, true);

    const returns = items.find((i) => i.id === "returns");
    assert.equal(returns?.href, "/app/returns");
    assert.equal(returns?.available, true);
  });

  it("restricts legacy DRIVER accounts to dashboard only", () => {
    const sections = buildAppNav("DRIVER");
    const items = sections.flatMap((s) => s.items);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.id, "dashboard");
    assert.equal(items[0]?.href, "/app/driver");
    assert.equal(
      items.some((i) => i.id === "products" && i.available),
      false,
    );
    assert.equal(
      items.some((i) => i.id === "deliveries"),
      false,
    );
    assert.equal(
      items.some((i) => i.id === "dispatch"),
      false,
    );
    assert.equal(
      items.some((i) => i.id === "assignments"),
      false,
    );
    assert.equal(
      items.some((i) => i.id === "drivers"),
      false,
    );
    assert.equal(
      items.some((i) => i.id === "payments"),
      false,
    );
    assert.equal(
      items.some((i) => i.id === "returns"),
      false,
    );
    assert.equal(
      items.some((i) => i.id === "users" && i.available),
      false,
    );
  });
});

describe("nav helpers", () => {
  it("reports role capabilities", () => {
    assert.equal(canAccessMasterData("ADMIN"), true);
    assert.equal(canAccessMasterData("STAFF"), true);
    assert.equal(canAccessMasterData("DRIVER"), false);
    assert.equal(canAccessOperations("ADMIN"), true);
    assert.equal(canAccessOperations("STAFF"), true);
    assert.equal(canAccessOperations("DRIVER"), false);
    assert.equal(canAccessUserManagement("ADMIN"), true);
    assert.equal(canAccessUserManagement("STAFF"), false);
  });

  it("highlights active routes without false positives on dashboards", () => {
    assert.equal(isNavItemActive("/app/products", "/app/products"), true);
    assert.equal(isNavItemActive("/app/products/abc", "/app/products"), true);
    assert.equal(isNavItemActive("/app/admin/users", "/app/admin"), false);
    assert.equal(isNavItemActive("/app/admin", "/app/admin"), true);
  });
});
