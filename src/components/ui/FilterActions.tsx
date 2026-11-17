"use client";

import { LoadingButton } from "@/components/ui/LoadingButton";
import { cn } from "@/lib/utils/cn";

/**
 * Shared Apply / Clear actions for list filter forms.
 * Keeps pending feedback consistent without competing full-page spinners.
 */
export function FilterActions({
  pending,
  onClear,
  applyLabel = "Apply filters",
  pendingApplyLabel = "Filtering…",
  clearLabel = "Clear",
  className,
  showClear = true,
}: {
  pending: boolean;
  onClear?: () => void;
  applyLabel?: string;
  pendingApplyLabel?: string;
  clearLabel?: string;
  className?: string;
  showClear?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-end",
        pending && "opacity-95",
        className,
      )}
      aria-busy={pending}
    >
      <LoadingButton
        type="submit"
        pending={pending}
        idleLabel={applyLabel}
        pendingLabel={pendingApplyLabel}
        variant="primary"
        className="min-h-11 flex-1 px-4 py-2.5 sm:flex-none sm:py-2"
      />
      {showClear && onClear ? (
        <LoadingButton
          type="button"
          pending={pending}
          idleLabel={clearLabel}
          pendingLabel="Clearing…"
          variant="secondary"
          className="min-h-11 flex-1 px-4 py-2.5 sm:flex-none sm:py-2"
          onClick={() => {
            if (pending) return;
            onClear();
          }}
        />
      ) : null}
    </div>
  );
}
