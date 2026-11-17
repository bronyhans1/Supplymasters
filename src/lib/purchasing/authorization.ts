import type { Profile } from "@/types/profile";
import type { AppRole } from "@/lib/auth/roles";
import { ROLE_PERMISSIONS } from "@/lib/auth/roles";

export function canAccessPurchasing(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (profile.must_change_password) return false;
  return ROLE_PERMISSIONS[profile.role].managePurchases;
}

export function roleCanAccessPurchasing(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].managePurchases;
}
