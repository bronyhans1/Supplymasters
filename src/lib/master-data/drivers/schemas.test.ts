import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  driverUpdateSchema,
  driverWriteSchema,
  listDriversQuerySchema,
  setDriverActiveSchema,
} from "@/lib/master-data/drivers/schemas";
import {
  PROTECTED_MASTER_DATA_FIELDS,
  canManageDrivers,
  isProtectedMasterDataField,
  roleCanManageDrivers,
} from "@/lib/master-data/authorization";
import type { Profile } from "@/types/profile";

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

describe("driverWriteSchema", () => {
  it("requires a non-blank full name and phone", () => {
    assert.equal(
      driverWriteSchema.safeParse({
        full_name: "",
        phone: "0244123456",
        notes: "",
      }).success,
      false,
    );
    assert.equal(
      driverWriteSchema.safeParse({
        full_name: "Kwame Mensah",
        phone: "",
        notes: "",
      }).success,
      false,
    );
  });

  it("trims values and allows optional blank notes", () => {
    const result = driverWriteSchema.safeParse({
      full_name: "  Ama Boateng  ",
      phone: " 0244123456 ",
      notes: "   ",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.full_name, "Ama Boateng");
      assert.equal(result.data.phone, "0244123456");
      assert.equal(result.data.notes, null);
      assert.equal(result.data.is_active, true);
      assert.equal("driver_code" in result.data, false);
      assert.equal("id" in result.data, false);
    }
  });

  it("keeps non-empty notes and rejects overlong phone values", () => {
    const withNotes = driverWriteSchema.safeParse({
      full_name: "Yaw",
      phone: "0200000000",
      notes: "Prefers morning dispatches",
    });
    assert.equal(withNotes.success, true);
    if (withNotes.success) {
      assert.equal(withNotes.data.notes, "Prefers morning dispatches");
    }

    assert.equal(
      driverWriteSchema.safeParse({
        full_name: "Yaw",
        phone: "1".repeat(41),
        notes: "",
      }).success,
      false,
    );
  });

  it("does not accept a client-supplied driver code", () => {
    const result = driverWriteSchema.safeParse({
      full_name: "Ama",
      phone: "0244",
      notes: "",
      driver_code: "NM-DRV-000001",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal("driver_code" in result.data, false);
    }
  });
});

describe("driverUpdateSchema and status schema", () => {
  it("requires a valid uuid for updates and status changes", () => {
    assert.equal(
      driverUpdateSchema.safeParse({
        id: "bad",
        full_name: "Ama",
        phone: "0244",
        notes: "",
      }).success,
      false,
    );
    assert.equal(
      driverUpdateSchema.safeParse({
        id: "11111111-1111-4111-8111-111111111111",
        full_name: "Ama",
        phone: "0244",
        notes: "",
      }).success,
      true,
    );
    assert.equal(
      setDriverActiveSchema.safeParse({
        id: "11111111-1111-4111-8111-111111111111",
        isActive: false,
      }).success,
      true,
    );
    assert.equal(
      setDriverActiveSchema.safeParse({ id: "bad", isActive: true }).success,
      false,
    );
  });
});

describe("listDriversQuerySchema", () => {
  it("defaults and paginates safely", () => {
    const empty = listDriversQuerySchema.parse({});
    assert.equal(empty.q, "");
    assert.equal(empty.status, "ALL");
    assert.equal(empty.page, 1);

    const filtered = listDriversQuerySchema.parse({
      q: "  NM-DRV  ",
      status: "ACTIVE",
      page: "2",
    });
    assert.equal(filtered.q, "NM-DRV");
    assert.equal(filtered.status, "ACTIVE");
    assert.equal(filtered.page, 2);

    assert.equal(
      listDriversQuerySchema.safeParse({ page: "0" }).success,
      false,
    );
  });
});

describe("driver authorization helpers", () => {
  it("allows ADMIN only for Driver Management", () => {
    assert.equal(canManageDrivers(profile({ role: "ADMIN" })), true);
    assert.equal(canManageDrivers(profile({ role: "STAFF" })), false);
    assert.equal(canManageDrivers(profile({ role: "DRIVER" })), false);
    assert.equal(canManageDrivers(null), false);
    assert.equal(canManageDrivers(profile({ is_active: false })), false);
    assert.equal(
      canManageDrivers(profile({ must_change_password: true })),
      false,
    );
    assert.equal(roleCanManageDrivers("ADMIN"), true);
    assert.equal(roleCanManageDrivers("STAFF"), false);
    assert.equal(roleCanManageDrivers("DRIVER"), false);
  });

  it("protects driver_code and audit fields from client writes", () => {
    assert.equal(isProtectedMasterDataField("driver_code"), true);
    assert.equal(isProtectedMasterDataField("id"), true);
    assert.equal(isProtectedMasterDataField("created_by"), true);
    assert.equal(isProtectedMasterDataField("full_name"), false);
    assert.ok(PROTECTED_MASTER_DATA_FIELDS.includes("driver_code"));
  });

  it("supports activate/deactivate payloads without a delete schema", () => {
    // Soft status only — deactivate via setDriverActiveSchema; no deleteDriver schema exists.
    const deactivate = setDriverActiveSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      isActive: false,
    });
    assert.equal(deactivate.isActive, false);
    assert.equal(isProtectedMasterDataField("id"), true);
  });
});
