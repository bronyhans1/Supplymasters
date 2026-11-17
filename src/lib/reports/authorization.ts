import type { Profile } from "@/types/profile";
import type { AppRole } from "@/lib/auth/roles";
import { ROLE_PERMISSIONS } from "@/lib/auth/roles";

export function roleCanAccessReports(role: AppRole): boolean {
  return ROLE_PERMISSIONS[role].viewReports;
}

export function canAccessReports(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (profile.must_change_password) return false;
  return roleCanAccessReports(profile.role);
}

export function canViewAuditLogs(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  if (!profile.is_active) return false;
  if (profile.must_change_password) return false;
  return ROLE_PERMISSIONS[profile.role].viewAuditLogs;
}
