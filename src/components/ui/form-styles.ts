import { cn } from "@/lib/utils/cn";

/**
 * Shared control chrome for forms.
 * `text-base` avoids iOS Safari focus zoom; `min-h-11` keeps ~44px touch targets.
 * Narrow screens stay one-column; callers opt into `sm:grid-cols-*` where useful.
 */
export const formControlClass = cn(
  "min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink",
  "outline-none focus:border-accent focus:ring-2 focus:ring-accent/30",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "sm:text-sm",
);

/** Surface-tinted variant used on some operational panels. */
export const formControlSurfaceClass = cn(
  formControlClass,
  "bg-surface",
);

/** Paper-tinted variant used on some admin/master-data panels. */
export const formControlPaperClass = cn(
  formControlClass,
  "bg-paper",
);

export const formLabelClass = "block text-sm font-medium text-ink";

export const formHelpClass = "block text-xs leading-5 text-muted";

export const formErrorClass = "text-sm text-accent";

/** Secondary / cancel control — comfortable touch target. */
export const formSecondaryButtonClass = cn(
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-line",
  "bg-white px-4 py-2.5 text-sm font-medium text-ink transition",
  "hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60",
);

export const formGhostButtonClass = cn(
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-line",
  "bg-surface px-4 py-2.5 text-sm font-medium text-ink transition",
  "hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60",
);
