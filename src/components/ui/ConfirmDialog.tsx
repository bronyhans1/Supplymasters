"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, HelpCircle, ShieldAlert } from "lucide-react";
import { LoadingButton } from "@/components/ui/LoadingButton";
import { cn } from "@/lib/utils/cn";

export type ConfirmVariant = "default" | "destructive" | "warning";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const VARIANT_ICON = {
  default: HelpCircle,
  warning: AlertTriangle,
  destructive: ShieldAlert,
} as const;

const VARIANT_ICON_CLASS = {
  default: "bg-ink/5 text-ink",
  warning: "bg-accent/10 text-accent",
  destructive: "bg-accent/10 text-accent",
} as const;

const VARIANT_CONFIRM_BUTTON = {
  default: "primary",
  warning: "accent",
  destructive: "accent",
} as const;

export function ConfirmDialog({
  open,
  title,
  description,
  variant = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pendingLabel = "Working…",
  pending = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const Icon = VARIANT_ICON[variant];

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const node = dialogRef.current;
    const focusable = node?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          "flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-[0_20px_60px_color-mix(in_srgb,var(--color-ink)_12%,transparent)]",
          "max-h-[90vh] max-h-[90dvh] sm:rounded-xl",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-5 [-webkit-overflow-scrolling:touch] touch-pan-y">
          <div className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg",
                VARIANT_ICON_CLASS[variant],
              )}
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 space-y-2">
              <h2 id={titleId} className="font-display text-xl tracking-tight text-ink">
                {title}
              </h2>
              <div id={descriptionId} className="text-sm leading-6 text-muted">
                {description}
              </div>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-accent"
            >
              {error}
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-4 sm:flex-row sm:justify-end",
            "pb-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-4 py-2.5 text-sm text-ink transition hover:bg-paper outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <LoadingButton
            type="button"
            pending={pending}
            idleLabel={confirmLabel}
            pendingLabel={pendingLabel}
            onClick={onConfirm}
            variant={VARIANT_CONFIRM_BUTTON[variant]}
            className="w-full sm:w-auto"
          />
        </div>
      </div>
    </div>
  );
}
