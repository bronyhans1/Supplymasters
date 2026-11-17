/**
 * Application roles mirror public.app_role.
 * DRIVER remains in the database enum for legacy compatibility but is not
 * provisionable and has no operational application permissions.
 *
 * STAFF vs ADMIN capabilities follow the confirmed Phase C1 permission matrix
 * (docs/c1-remaining-security-audit.md / docs/c1-admin-staff-permission-remediation.md).
 */
export const APP_ROLES = ["ADMIN", "STAFF", "DRIVER"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Roles that may be created or assigned through administrator user management. */
export const PROVISIONABLE_ROLES = ["ADMIN", "STAFF"] as const;

export type ProvisionableRole = (typeof PROVISIONABLE_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

export function isProvisionableRole(value: unknown): value is ProvisionableRole {
  return (
    typeof value === "string" &&
    (PROVISIONABLE_ROLES as readonly string[]).includes(value)
  );
}

export function hasRequiredRole(role: AppRole | null | undefined, allowed: AppRole[]): boolean {
  return role !== null && role !== undefined && allowed.includes(role);
}

export const ROLE_PERMISSIONS = {
  ADMIN: {
    manageStaff: true,
    manageVendors: true,
    manageProducts: true,
    manageSuppliers: true,
    managePurchases: true,
    manageInventory: true,
    manageSupplies: true,
    managePayments: true,
    manageDeliveries: true,
    /** Assign/reassign/clear delivery staff + operational driver — ADMIN only. */
    manageDeliveryAssignments: true,
    manageDrivers: true,
    viewReports: true,
    viewAuditLogs: true,
    manageSettings: true,
  },
  STAFF: {
    manageStaff: false,
    manageVendors: true,
    /** Catalogue write is ADMIN-only; STAFF may still SELECT products for supplies. */
    manageProducts: false,
    manageSuppliers: false,
    managePurchases: false,
    manageInventory: true,
    manageSupplies: true,
    managePayments: true,
    /** Status / outcomes remain STAFF; assignment mutations are ADMIN-only. */
    manageDeliveries: true,
    manageDeliveryAssignments: false,
    /** Driver Management is ADMIN-only; STAFF may SELECT drivers for deliveries. */
    manageDrivers: false,
    viewReports: false,
    viewAuditLogs: false,
    manageSettings: false,
  },
  /** Legacy Auth role — no operational access in the application. */
  DRIVER: {
    manageStaff: false,
    manageVendors: false,
    manageProducts: false,
    manageSuppliers: false,
    managePurchases: false,
    manageInventory: false,
    manageSupplies: false,
    managePayments: false,
    manageDeliveries: false,
    manageDeliveryAssignments: false,
    manageDrivers: false,
    viewReports: false,
    viewAuditLogs: false,
    manageSettings: false,
  },
} as const satisfies Record<AppRole, Record<string, boolean>>;
