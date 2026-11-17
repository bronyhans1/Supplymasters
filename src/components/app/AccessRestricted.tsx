import Link from "next/link";

/**
 * Friendly authorization denial UI for expected 403s.
 * Keeps the surrounding /app shell (sidebar) when rendered from forbidden/error boundaries.
 */
export function AccessRestricted({ dashboardHref }: { dashboardHref: string }) {
  return (
    <section className="mx-auto w-full max-w-xl space-y-4 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
        Authorization
      </p>
      <h1 className="font-display text-3xl tracking-tight text-ink">
        Access Restricted
      </h1>
      <p className="text-sm leading-6 text-muted">
        You don&apos;t have permission to access this page. Contact your
        administrator if you believe you need access.
      </p>
      <Link
        href={dashboardHref}
        className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink/90"
      >
        Return to dashboard
      </Link>
    </section>
  );
}
