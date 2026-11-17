import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Shared page title row for /app routes.
 * Stacks title and actions on narrow screens; keeps a side-by-side row from sm up.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <div className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
