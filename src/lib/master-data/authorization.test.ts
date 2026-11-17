import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canManageDrivers,
  canManageMasterData,
  canManageProducts,
  canManageSuppliers,
  canManageVendors,
  canSelectDriversForDeliveries,
  canViewProducts,
  isProtectedMasterDataField,
} from "@/lib/master-data/authorization";
import { productWriteSchema } from "@/lib/master-data/products/schemas";
import { vendorWriteSchema } from "@/lib/master-data/vendors/schemas";
import { supplierWriteSchema } from "@/lib/master-data/suppliers/schemas";
import { driverWriteSchema } from "@/lib/master-data/drivers/schemas";
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

describe("matrix-aligned master-data authorization", () => {
  it("allows STAFF vendor management and product viewing", () => {
    assert.equal(canManageVendors(profile({ role: "STAFF" })), true);
    assert.equal(canViewProducts(profile({ role: "STAFF" })), true);
    assert.equal(canManageMasterData(profile({ role: "STAFF" })), true);
  });

  it("denies STAFF product, supplier, and driver management", () => {
    assert.equal(canManageProducts(profile({ role: "STAFF" })), false);
    assert.equal(canManageSuppliers(profile({ role: "STAFF" })), false);
    assert.equal(canManageDrivers(profile({ role: "STAFF" })), false);
  });

  it("allows ADMIN product, supplier, and driver management", () => {
    assert.equal(canManageProducts(profile({ role: "ADMIN" })), true);
    assert.equal(canManageSuppliers(profile({ role: "ADMIN" })), true);
    assert.equal(canManageDrivers(profile({ role: "ADMIN" })), true);
    assert.equal(canManageVendors(profile({ role: "ADMIN" })), true);
  });

  it("allows STAFF to select drivers for deliveries without Driver Management", () => {
    assert.equal(canSelectDriversForDeliveries(profile({ role: "STAFF" })), true);
    assert.equal(canSelectDriversForDeliveries(profile({ role: "ADMIN" })), true);
    assert.equal(canSelectDriversForDeliveries(profile({ role: "DRIVER" })), false);
  });

  it("denies drivers and inactive accounts", () => {
    assert.equal(canManageVendors(profile({ role: "DRIVER" })), false);
    assert.equal(canViewProducts(profile({ is_active: false })), false);
    assert.equal(
      canManageProducts(profile({ role: "ADMIN", must_change_password: true })),
      false,
    );
  });
});

describe("protected master-data fields", () => {
  it("blocks codes and attribution fields", () => {
    assert.equal(isProtectedMasterDataField("product_code"), true);
    assert.equal(isProtectedMasterDataField("vendor_code"), true);
    assert.equal(isProtectedMasterDataField("supplier_code"), true);
    assert.equal(isProtectedMasterDataField("driver_code"), true);
    assert.equal(isProtectedMasterDataField("created_by"), true);
    assert.equal(isProtectedMasterDataField("name"), false);
  });
});

describe("master-data schemas", () => {
  it("rejects blank product fields and does not accept codes", () => {
    const bad = productWriteSchema.safeParse({
      name: "",
      brand: "A",
      category_id: "11111111-1111-4111-8111-111111111111",
      packaging_size: "C",
      unit_of_measure: "D",
    });
    assert.equal(bad.success, false);

    const good = productWriteSchema.safeParse({
      name: "Spaghetti 400g",
      brand: "NM",
      category_id: "11111111-1111-4111-8111-111111111111",
      packaging_size: "400g",
      unit_of_measure: "carton",
    });
    assert.equal(good.success, true);
    if (good.success) {
      assert.equal("product_code" in good.data, false);
      assert.equal("category" in good.data, false);
      assert.equal(good.data.category_id, "11111111-1111-4111-8111-111111111111");
    }
  });

  it("requires category_id and accepts free-text brand/packaging/unit values", () => {
    const missingCategory = productWriteSchema.safeParse({
      name: "NM Noodles",
      brand: "NM",
      packaging_size: "Carton",
      unit_of_measure: "Carton",
    });
    assert.equal(missingCategory.success, false);

    const custom = productWriteSchema.safeParse({
      name: "NM Noodles",
      brand: "Custom Brand",
      category_id: "11111111-1111-4111-8111-111111111111",
      packaging_size: "40 × 70 g per carton",
      unit_of_measure: "Bag",
    });
    assert.equal(custom.success, true);
  });

  it("requires vendor business fields with contact-person terminology", () => {
    const missingContact = vendorWriteSchema.safeParse({
      business_name: "Shop",
      contact_person: "",
      phone: "024",
      alt_phone: "",
      location: "Accra",
      digital_address: "",
      notes: "",
    });
    assert.equal(missingContact.success, false);
    if (!missingContact.success) {
      assert.match(
        missingContact.error.issues.map((issue) => issue.message).join(" "),
        /Contact person/i,
      );
    }

    assert.equal(
      vendorWriteSchema.safeParse({
        business_name: "Shop",
        contact_person: "Ama",
        phone: "024",
        alt_phone: "",
        location: "Accra",
        digital_address: "",
        notes: "",
      }).success,
      true,
    );
  });

  it("allows optional supplier contact fields and keeps values editable", () => {
    assert.equal(
      supplierWriteSchema.safeParse({
        name: "Mill Co",
        contact_person: "",
        phone: "",
        location: "",
        notes: "",
      }).success,
      true,
    );

    const corrected = supplierWriteSchema.safeParse({
      name: "Mill Co",
      contact_person: "Kwame Mensah",
      phone: "0244123456",
      location: "Tema",
      notes: "Fixed swapped contact/phone",
    });
    assert.equal(corrected.success, true);
  });

  it("requires driver name and phone without accepting a driver code", () => {
    assert.equal(
      driverWriteSchema.safeParse({
        full_name: "",
        phone: "0244",
        notes: "",
      }).success,
      false,
    );
    const good = driverWriteSchema.safeParse({
      full_name: "Kojo Asante",
      phone: "0244123456",
      notes: "",
    });
    assert.equal(good.success, true);
    if (good.success) {
      assert.equal("driver_code" in good.data, false);
    }
    assert.equal(canManageDrivers(profile({ role: "STAFF" })), false);
    assert.equal(canManageDrivers(profile({ role: "ADMIN" })), true);
    assert.equal(canManageDrivers(profile({ role: "DRIVER" })), false);
  });
});
