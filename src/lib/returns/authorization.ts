import type { Profile } from "@/types/profile";
import type { AppRole } from "@/lib/auth/roles";
import type { DeliveryStatus } from "@/types/database";

export function canAccessReturns(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (profile.must_change_password) return false;
  return profile.role === "ADMIN" || profile.role === "STAFF";
}

export function roleCanAccessReturns(role: AppRole): boolean {
  return role === "ADMIN" || role === "STAFF";
}

/** Matches record_delivery_stock_return: only FAILED or CANCELLED. */
export function canRecordReturnForDeliveryStatus(
  status: DeliveryStatus,
): boolean {
  return status === "FAILED" || status === "CANCELLED";
}
