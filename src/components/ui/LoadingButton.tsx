"use client";

import { cn } from "@/lib/utils/cn";

export type LoadingButtonVariant = "primary" | "secondary" | "danger" | "accent";

const VARIANT_CLASS: Record<LoadingButtonVariant, string> = {
  primary:
    "bg-ink text-paper hover:bg-ink/90 border border-transparent",
  accent:
    "bg-accent text-paper hover:bg-accent/90 border border-transparent",
  secondary:
    "border border-line bg-surface text-ink hover:bg-paper",
  danger:
    "border border-accent/40 bg-accent/5 text-accent hover:bg-accent/10",
};

const SPINNER_CLASS: Record<LoadingButtonVariant, string> = {
  primary: "border-paper/30 border-t-paper",
  accent: "border-paper/30 border-t-paper",
  secondary: "border-line border-t-ink",
  danger: "border-accent/30 border-t-accent",
};

export function LoadingButton({
  pending,
  idleLabel,
  pendingLabel,
  type = "button",
  disabled,
  className,
  onClick,
  variant = "primary",
}: {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  variant?: LoadingButtonVariant;
}) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
        "transition disabled:cursor-not-allowed disabled:opacity-60",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 rounded-full border-2",
          SPINNER_CLASS[variant],
          pending
            ? "animate-spin opacity-100 motion-reduce:animate-none"
            : "opacity-0",
        )}
      />
      <span className="inline-grid justify-items-center">
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
          {idleLabel.length >= pendingLabel.length ? idleLabel : pendingLabel}
        </span>
        <span className="col-start-1 row-start-1 whitespace-nowrap">
          {pending ? pendingLabel : idleLabel}
        </span>
      </span>
    </button>
  );
}
