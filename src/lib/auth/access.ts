import type { AppRole } from "@/lib/auth/roles";
import type { Profile } from "@/types/profile";

export type AccessGate =
  | { status: "unauthenticated" }
  | { status: "inactive" }
  | { status: "password_change_required"; redirectTo: "/change-password" }
  | { status: "allowed"; redirectTo: string };

/** Role home placeholders — business dashboards come later. */
export function roleHomePath(role: AppRole): string {
  switch (role) {
    case "ADMIN":
      return "/app/admin";
    case "STAFF":
      return "/app/staff";
    case "DRIVER":
      return "/app/driver";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

/**
 * Destination after a successful sign-in (session already established).
 * Caller must have already rejected missing/inactive profiles.
 */
export function postSignInPath(profile: Pick<Profile, "must_change_password" | "role">): string {
  if (profile.must_change_password) {
    return "/change-password";
  }
  return roleHomePath(profile.role);
}

/**
 * Server-side gate for normal application areas under /app.
 * Does not trust browser-supplied role or flags — pass DB profile only.
 */
export function evaluateAppAccess(profile: Profile | null): AccessGate {
  if (!profile) {
    return { status: "unauthenticated" };
  }
  if (!profile.is_active) {
    return { status: "inactive" };
  }
  if (profile.must_change_password) {
    return { status: "password_change_required", redirectTo: "/change-password" };
  }
  return { status: "allowed", redirectTo: roleHomePath(profile.role) };
}

/**
 * Server-side gate for the mandatory password-change page.
 */
export function evaluatePasswordChangeAccess(profile: Profile | null): AccessGate {
  if (!profile) {
    return { status: "unauthenticated" };
  }
  if (!profile.is_active) {
    return { status: "inactive" };
  }
  if (!profile.must_change_password) {
    return { status: "allowed", redirectTo: roleHomePath(profile.role) };
  }
  return { status: "password_change_required", redirectTo: "/change-password" };
}

export function isProtectedAppPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

export function isPasswordChangePath(pathname: string): boolean {
  return pathname === "/change-password" || pathname.startsWith("/change-password/");
}

export function isSignInPath(pathname: string): boolean {
  return pathname === "/sign-in" || pathname.startsWith("/sign-in/");
}

/** Paths that require an authenticated Supabase session cookie. */
export function requiresAuthenticatedSession(pathname: string): boolean {
  return isProtectedAppPath(pathname) || isPasswordChangePath(pathname);
}
