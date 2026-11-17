import type { Profile } from "@/types/profile";
import type { AppRole } from "@/lib/auth/roles";
import { ROLE_PERMISSIONS } from "@/lib/auth/roles";

function isEligibleProfile(profile: Profile | null | undefined): profile is Profile {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (profile.must_change_password) return false;
  return true;
}

/** Vendors remain STAFF + ADMIN. */
export function canManageVendors(profile: Profile | null | undefined): boolean {
  if (!isEligibleProfile(profile)) return false;
  return ROLE_PERMISSIONS[profile.role].manageVendors;
}

export function roleCanManageVendors(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].manageVendors;
}

/** Product catalogue create/edit — ADMIN only. */
export function canManageProducts(profile: Profile | null | undefined): boolean {
  if (!isEligibleProfile(profile)) return false;
  return ROLE_PERMISSIONS[profile.role].manageProducts;
}

export function roleCanManageProducts(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].manageProducts;
}

/** STAFF and ADMIN may list/select products for operational work. */
export function canViewProducts(profile: Profile | null | undefined): boolean {
  if (!isEligibleProfile(profile)) return false;
  return profile.role === "ADMIN" || profile.role === "STAFF";
}

export function roleCanViewProducts(role: AppRole): boolean {
  return role === "ADMIN" || role === "STAFF";
}

/** Stock supplier management — ADMIN only. */
export function canManageSuppliers(profile: Profile | null | undefined): boolean {
  if (!isEligibleProfile(profile)) return false;
  return ROLE_PERMISSIONS[profile.role].manageSuppliers;
}

export function roleCanManageSuppliers(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].manageSuppliers;
}

/**
 * @deprecated Prefer canManageVendors / canManageProducts / canManageSuppliers.
 * Kept for transitional call sites that mean "vendor-style operational master data".
 */
export function canManageMasterData(profile: Profile | null | undefined): boolean {
  return canManageVendors(profile);
}

/**
 * @deprecated Prefer role-specific helpers.
 */
export function roleCanManageMasterData(role: AppRole): boolean {
  return roleCanManageVendors(role);
}

/** Fields that must never be accepted from client forms for master-data tables. */
export const PROTECTED_MASTER_DATA_FIELDS = [
  "id",
  "product_code",
  "vendor_code",
  "supplier_code",
  "driver_code",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
] as const;

/** Driver Management create/edit/deactivate — ADMIN only. */
export function canManageDrivers(profile: Profile | null | undefined): boolean {
  if (!isEligibleProfile(profile)) return false;
  return ROLE_PERMISSIONS[profile.role].manageDrivers;
}

export function roleCanManageDrivers(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].manageDrivers;
}

/** STAFF/ADMIN may SELECT drivers for delivery assignment filters. */
export function canSelectDriversForDeliveries(
  profile: Profile | null | undefined,
): boolean {
  if (!isEligibleProfile(profile)) return false;
  return ROLE_PERMISSIONS[profile.role].manageDeliveries;
}

export function isProtectedMasterDataField(field: string): boolean {
  return (PROTECTED_MASTER_DATA_FIELDS as readonly string[]).includes(field);
}
