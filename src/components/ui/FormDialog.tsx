"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formErrorClass } from "@/components/ui/form-styles";

export type FormDialogProps = {
  title: string;
  description?: string;
  pending?: boolean;
  error?: string | null;
  onClose: () => void;
  children: ReactNode;
  /** Sticky action row (submit/cancel). Rendered outside the scroll region. */
  footer: ReactNode;
  /** When set, body + footer are wrapped in a `<form>`. */
  formAction?: (formData: FormData) => void;
  formId?: string;
  /** Accessible title element id — generated when omitted. */
  titleId?: string;
  size?: "md" | "lg";
  className?: string;
  /**
   * When false, Escape / backdrop / close button do nothing (e.g. one-time
   * secret reveal where only the footer action should dismiss).
   */
  dismissible?: boolean;
};

/**
 * Shared create/edit modal shell: mobile bottom sheet, desktop centered panel,
 * scrollable body, sticky footer, safe-area padding, Escape + focus trap.
 *
 * Scroll model (critical on iOS): the panel is height-capped with max-h + flex
 * column; the form/wrapper is min-h-0 overflow-hidden; only the body scrolls.
 */
export function FormDialog({
  title,
  description,
  pending = false,
  error = null,
  onClose,
  children,
  footer,
  formAction,
  formId,
  titleId: titleIdProp,
  size = "lg",
  className,
  dismissible = true,
}: FormDialogProps) {
  const generatedTitleId = useId();
  const titleId = titleIdProp ?? generatedTitleId;
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const blockDismissRef = useRef(pending || !dismissible);
  useEffect(() => {
    onCloseRef.current = onClose;
    blockDismissRef.current = pending || !dismissible;
  });

  useEffect(() => {
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // iOS-friendly body lock: overflow:hidden alone often breaks nested scroll.
    const body = document.body;
    const previous = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      left: body.style.left,
      right: body.style.right,
    };
    const scrollY = window.scrollY;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    const node = dialogRef.current;
    // Prefer focusing the first field inside the scroll region, not the close button.
    const focusRoot = scrollRef.current ?? node;
    const focusable = focusRoot?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const firstField = focusRoot?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    (firstField ?? focusable?.[0])?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!blockDismissRef.current) onCloseRef.current();
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
      body.style.overflow = previous.overflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.left = previous.left;
      body.style.right = previous.right;
      window.scrollTo(0, scrollY);
      previouslyFocused.current?.focus?.();
    };
  }, []);

  const body = (
    <>
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4",
          "[-webkit-overflow-scrolling:touch] touch-pan-y",
        )}
      >
        <div className="space-y-4">
          {error ? (
            <p role="alert" className={formErrorClass}>
              {error}
            </p>
          ) : null}
          {children}
        </div>
      </div>
      <div
        className={cn(
          "shrink-0 border-t border-line bg-paper px-5 py-4",
          "pb-[max(1rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          {footer}
        </div>
      </div>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      role="presentation"
      onClick={() => {
        if (!pending && dismissible) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          // Cap height with dvh/svh (not `100%`) so flex children get a real bound on iOS.
          "flex w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-paper shadow-xl",
          "max-h-[90vh] max-h-[90dvh] sm:rounded-xl",
          size === "lg" ? "sm:max-w-lg" : "sm:max-w-md",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-xl tracking-tight text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              aria-label="Close dialog"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line text-ink transition hover:bg-white outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-60"
            >
              <X aria-hidden="true" size={18} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>

        {formAction ? (
          <form
            id={formId}
            action={formAction}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            {body}
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{body}</div>
        )}
      </div>
    </div>
  );
}
