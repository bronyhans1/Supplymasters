import type { Profile } from "@/types/profile";
import type { AppRole } from "@/lib/auth/roles";
import { ROLE_PERMISSIONS } from "@/lib/auth/roles";

export function canAccessDeliveries(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (profile.must_change_password) return false;
  return profile.role === "ADMIN" || profile.role === "STAFF";
}

export function roleCanAccessDeliveries(role: AppRole): boolean {
  return role === "ADMIN" || role === "STAFF";
}

/**
 * Assign / reassign / clear operational driver or responsible staff.
 * Server Actions and RPCs must enforce ADMIN independently of this helper.
 */
export function canManageDeliveryAssignments(
  profile: Profile | null | undefined,
): boolean {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (profile.must_change_password) return false;
  return ROLE_PERMISSIONS[profile.role].manageDeliveryAssignments;
}

export function roleCanManageDeliveryAssignments(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].manageDeliveryAssignments;
}
