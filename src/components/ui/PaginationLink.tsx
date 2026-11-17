"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { useNavigationProgress } from "@/components/navigation/NavigationProgress";
import { cn } from "@/lib/utils/cn";

/**
 * Pagination control with per-link pending feedback via useLinkStatus.
 * Starts the global progress bar on navigate; does not replace list chrome.
 */
export function PaginationLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { begin } = useNavigationProgress();

  return (
    <Link
      href={href}
      onNavigate={() => begin()}
      className={cn(
        "inline-flex min-h-11 min-w-[5.5rem] items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink transition hover:bg-paper outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper xl:min-h-0 xl:py-1.5",
        className,
      )}
    >
      <PaginationLinkLabel>{children}</PaginationLinkLabel>
    </Link>
  );
}

function PaginationLinkLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        "inline-grid justify-items-center",
        pending && "text-muted",
      )}
      aria-busy={pending}
    >
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
        Loading…
      </span>
      <span className="col-start-1 row-start-1 whitespace-nowrap">
        {pending ? "Loading…" : children}
      </span>
    </span>
  );
}
