import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getCurrentProfile } from "@/lib/auth/session";
import { env } from "@/config/env";

export async function AuthNav() {
  if (!env.hasPublicSupabaseConfig) {
    return null;
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <Link
        href="/sign-in"
        className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-paper transition hover:bg-ink/90"
      >
        Staff Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {profile.role === "ADMIN" && profile.is_active && !profile.must_change_password ? (
        <Link
          href="/app/admin/users"
          className="hidden rounded-lg border border-line px-3 py-1.5 text-sm text-ink transition hover:bg-paper sm:inline"
        >
          Users
        </Link>
      ) : null}
      <span className="hidden text-xs text-muted sm:inline">
        {profile.full_name}
      </span>
      <SignOutButton />
    </div>
  );
}
