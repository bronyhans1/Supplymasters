import { requireAuth } from "@/lib/auth/session";
import { roleHomePath } from "@/lib/auth/access";
import { redirect } from "next/navigation";

/**
 * Legacy DRIVER Auth role home.
 * Operational drivers are master-data records — they do not sign in here.
 * Existing DRIVER accounts are not deleted; they receive an unsupported-account notice.
 */
export default async function DriverHomePage() {
  const { profile } = await requireAuth();

  if (profile.role !== "DRIVER") {
    redirect(roleHomePath(profile.role));
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
          Unsupported account
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
          Driver sign-in retired
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Signed in as {profile.full_name}. Application access for the DRIVER role has
          been retired. Delivery work is managed by staff and administrators using
          operational driver records — not driver logins.
        </p>
      </div>
      <div className="rounded-xl border border-line bg-white/70 p-5 text-sm leading-6 text-muted">
        <p>
          This account cannot manage deliveries, drivers, inventory, or other
          operations. Ask an administrator to convert the account to STAFF or ADMIN
          if application access is still required.
        </p>
      </div>
    </section>
  );
}
