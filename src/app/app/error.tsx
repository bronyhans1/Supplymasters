"use client";

import { useEffect } from "react";
import { AccessRestricted } from "@/components/app/AccessRestricted";
import { isAuthorizationError } from "@/lib/utils/is-authorization-error";

/**
 * Unexpected route errors under /app.
 * Expected authorization denials should use forbidden() → forbidden.tsx;
 * this boundary still maps leftover 403 AppError messages to Access Restricted
 * so they never surface as a Next.js runtime overlay.
 */
export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!isAuthorizationError(error)) {
      console.error(error);
    }
  }, [error]);

  if (isAuthorizationError(error)) {
    return <AccessRestricted dashboardHref="/app" />;
  }

  return (
    <section className="mx-auto w-full max-w-xl space-y-4 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
        Something went wrong
      </p>
      <h1 className="font-display text-3xl tracking-tight text-ink">
        Unable to load this page
      </h1>
      <p className="text-sm leading-6 text-muted">
        An unexpected error occurred. You can try again, or return to your
        dashboard if the problem continues.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink/90"
        >
          Try again
        </button>
        <a
          href="/app"
          className="inline-flex items-center justify-center rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-white"
        >
          Return to dashboard
        </a>
      </div>
    </section>
  );
}
