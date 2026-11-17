import type { Profile } from "@/types/profile";
import type { AppRole } from "@/lib/auth/roles";

export function canAccessInventory(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (profile.must_change_password) return false;
  return profile.role === "ADMIN" || profile.role === "STAFF";
}

export function roleCanAccessInventory(role: AppRole): boolean {
  return role === "ADMIN" || role === "STAFF";
}
