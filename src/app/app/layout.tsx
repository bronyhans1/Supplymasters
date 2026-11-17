import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { evaluateAppAccess } from "@/lib/auth/access";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side gate + application shell for all /app routes.
 * Enforces authenticated + active + password-change-complete using DB profile.
 *
 * Always render per-request. Auth helpers may return early when public Supabase
 * env is absent (e.g. local build without .env), which skips cookies() and would
 * otherwise allow Next to statically prerender and throw UNAUTHENTICATED.
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const gate = evaluateAppAccess(profile);

  if (gate.status === "unauthenticated") {
    redirect("/sign-in?error=required");
  }

  if (gate.status === "inactive") {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/sign-in?error=inactive");
  }

  if (gate.status === "password_change_required") {
    redirect(gate.redirectTo);
  }

  // profile is non-null after evaluateAppAccess allowed path
  return <AppShell profile={profile!}>{children}</AppShell>;
}
