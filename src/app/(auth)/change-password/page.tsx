import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { evaluatePasswordChangeAccess } from "@/lib/auth/access";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ChangePasswordPage() {
  const profile = await getCurrentProfile();
  const gate = evaluatePasswordChangeAccess(profile);

  if (gate.status === "unauthenticated") {
    redirect("/sign-in?error=required");
  }

  if (gate.status === "inactive") {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/sign-in?error=inactive");
  }

  if (gate.status === "allowed") {
    redirect(gate.redirectTo);
  }

  return (
    <AuthShell
      title="Change temporary password"
      description="For security, you must replace your temporary password before using SUPPLY MASTERS."
    >
      <ChangePasswordForm />
    </AuthShell>
  );
}
