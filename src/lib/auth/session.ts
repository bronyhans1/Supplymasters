import "server-only";

import { cache } from "react";
import { forbidden } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/config/env";
import { AppError } from "@/lib/utils/errors";
import { hasRequiredRole, isAppRole, type AppRole } from "@/lib/auth/roles";
import type { Profile } from "@/types/profile";

export type AuthClaims = {
  sub?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
};

/**
 * Verified auth claims for the current request.
 * Request-scoped via React cache — one getClaims() per HTTP request.
 */
export const getAuthClaims = cache(async (): Promise<AuthClaims | null> => {
  if (!env.hasPublicSupabaseConfig) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  return data.claims as AuthClaims;
});

/**
 * Uncached profile SELECT for the current auth subject.
 * Use getCurrentProfile() for normal request-scoped reads.
 * Use getCurrentProfileFresh() after same-request profile mutations.
 */
async function loadCurrentProfileFromDb(): Promise<Profile | null> {
  const claims = await getAuthClaims();
  if (!claims?.sub) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, phone, role, is_active, must_change_password, created_at, updated_at",
    )
    .eq("id", claims.sub)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (!isAppRole(data.role)) {
    return null;
  }

  return data as Profile;
}

/**
 * Application profile for the current authenticated user.
 * Request-scoped via React cache — one profiles SELECT per HTTP request.
 */
export const getCurrentProfile = cache(loadCurrentProfileFromDb);

/**
 * Fresh profile read that bypasses the request-scoped getCurrentProfile cache.
 * Required after same-request mutations (e.g. clearing must_change_password).
 */
export async function getCurrentProfileFresh(): Promise<Profile | null> {
  return loadCurrentProfileFromDb();
}

/**
 * Authenticated session for the mandatory password-change flow only.
 * Requires an active account but allows must_change_password = true.
 * Request-scoped — still re-evaluated on each new action/request.
 */
export const requireAuthForPasswordChange = cache(async (): Promise<{
  claims: AuthClaims;
  profile: Profile;
}> => {
  const claims = await getAuthClaims();
  if (!claims?.sub) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    throw new AppError(403, "PROFILE_REQUIRED", "An application profile is required.");
  }

  if (!profile.is_active) {
    throw new AppError(403, "ACCOUNT_INACTIVE", "This account is inactive.");
  }

  if (!profile.must_change_password) {
    throw new AppError(
      400,
      "PASSWORD_CHANGE_NOT_REQUIRED",
      "A password change is not required for this account.",
    );
  }

  return { claims, profile };
});

/**
 * Normal application authorization. Blocks inactive accounts and accounts that
 * still must change a temporary password.
 * Request-scoped — layout, pages, and query helpers share one evaluation.
 */
export const requireAuth = cache(async (): Promise<{
  claims: AuthClaims;
  profile: Profile;
}> => {
  const claims = await getAuthClaims();
  if (!claims?.sub) {
    throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    throw new AppError(403, "PROFILE_REQUIRED", "An application profile is required.");
  }

  if (!profile.is_active) {
    throw new AppError(403, "ACCOUNT_INACTIVE", "This account is inactive.");
  }

  if (profile.must_change_password) {
    throw new AppError(
      403,
      "PASSWORD_CHANGE_REQUIRED",
      "You must change your temporary password before continuing.",
    );
  }

  return { claims, profile };
});

/**
 * Role gate on top of requireAuth(). Not cached itself: allowedRoles arrays are
 * compared by reference, and requireAuth() already provides request-scoped reuse.
 */
export async function requireRole(allowedRoles: AppRole[]): Promise<{
  claims: AuthClaims;
  profile: Profile;
}> {
  const auth = await requireAuth();

  if (!hasRequiredRole(auth.profile.role, allowedRoles)) {
    // Render app/forbidden.tsx (Access Restricted) instead of an unhandled runtime error.
    forbidden();
  }

  return auth;
}

export async function requireAdmin() {
  return requireRole(["ADMIN"]);
}

export async function requireStaffOrAdmin() {
  return requireRole(["ADMIN", "STAFF"]);
}
