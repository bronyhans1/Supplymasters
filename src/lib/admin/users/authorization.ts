import type { Profile } from "@/types/profile";
import { ROLE_PERMISSIONS, type AppRole } from "@/lib/auth/roles";

/**
 * Pure authorization helpers for admin user management.
 * Always re-verify with requireAdmin() on the server before privileged work.
 */
export function canManageUsers(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (profile.must_change_password) return false;
  return ROLE_PERMISSIONS[profile.role].manageStaff === true;
}

export function assertCanManageUsers(profile: Profile | null | undefined): void {
  if (!canManageUsers(profile)) {
    throw new Error("FORBIDDEN");
  }
}

export function isProtectedProfileField(field: string): boolean {
  return (
    field === "role" ||
    field === "is_active" ||
    field === "must_change_password" ||
    field === "email" ||
    field === "id"
  );
}

export function describeRole(role: AppRole): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "STAFF":
      return "Staff";
    case "DRIVER":
      return "Driver (unsupported)";
    default:
      return role;
  }
}
