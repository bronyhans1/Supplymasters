import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Shared focus ring for interactive listing/dashboard chrome.
 */
export const focusRingClass =
  "outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

/**
 * Desktop/large-tablet table shell.
 * Cards stay through typical tablet portrait (~1023px); tables from `lg`.
 * Aligns better with the xl drawer shell than the old `md` flip.
 */
export function DesktopTableShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hidden overflow-x-auto rounded-xl border border-line bg-white/70 lg:block",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Phone / tablet-portrait record stack — hidden from `lg` where the table shows.
 */
export function MobileRecordList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul className={cn("space-y-3 lg:hidden", className)} role="list">
      {children}
    </ul>
  );
}

export type RecordCardField = {
  label: string;
  value: ReactNode;
};

/**
 * Compact mobile/tablet-portrait record presentation.
 * Title + optional badge first; labeled fields; touch-friendly action row.
 */
export function RecordCard({
  title,
  subtitle,
  badge,
  fields,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  fields?: RecordCardField[];
  action?: ReactNode;
  className?: string;
}) {
  const visibleFields = (fields ?? []).filter(
    (field) => field.value !== null && field.value !== undefined && field.value !== "",
  );

  return (
    <li
      className={cn(
        "rounded-xl border border-line bg-white/70 p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--color-ink)_4%,transparent)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="break-words font-medium text-ink">{title}</div>
          {subtitle ? (
            <div className="mt-0.5 break-words text-sm text-muted">{subtitle}</div>
          ) : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>

      {visibleFields.length > 0 ? (
        <dl className="mt-3 space-y-2 border-t border-line/70 pt-3">
          {visibleFields.map((field) => (
            <div
              key={field.label}
              className="grid grid-cols-[minmax(5.5rem,32%)_1fr] gap-x-3 gap-y-0.5 text-sm"
            >
              <dt className="text-muted">{field.label}</dt>
              <dd className="min-w-0 break-words text-ink">{field.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {action ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line/70 pt-3">
          {action}
        </div>
      ) : null}
    </li>
  );
}

/**
 * Record action control: comfortable touch target on cards,
 * denser but still keyboard-focusable link on large-table rows.
 */
export function ListActionLink({
  href,
  children,
  className,
  variant = "card",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  /** `card` = full touch button; `table` = compact accent link. */
  variant?: "card" | "table";
}) {
  return (
    <Link
      href={href}
      className={cn(
        focusRingClass,
        variant === "card"
          ? "inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-medium text-accent transition hover:bg-paper sm:flex-none"
          : "inline-flex min-h-10 items-center rounded-md px-1 font-medium text-accent underline-offset-2 hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}
