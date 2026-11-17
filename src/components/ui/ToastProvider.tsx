"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createUuid } from "@/lib/utils/id";

export type ToastTone = "success" | "error" | "warning" | "info";

export type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (toast: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_CLASS: Record<ToastTone, string> = {
  success: "border-good/25 bg-good/10 text-good",
  error: "border-accent/30 bg-accent/5 text-accent",
  warning: "border-accent/30 bg-accent/5 text-accent",
  info: "border-line bg-surface text-ink",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [, startTransition] = useTransition();

  const dismiss = useCallback((id: string) => {
    startTransition(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    });
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = createUuid();
      const tone = toast.tone ?? "info";
      const durationMs = toast.durationMs ?? (tone === "error" ? 7000 : 4200);
      setToasts((current) => [
        ...current,
        {
          id,
          title: toast.title,
          message: toast.message,
          tone,
          durationMs,
        },
      ]);
      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs);
      }
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message, title) => push({ message, title, tone: "success" }),
      error: (message, title) => push({ message, title, tone: "error" }),
      warning: (message, title) => push({ message, title, tone: "warning" }),
      info: (message, title) => push({ message, title, tone: "info" }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-end gap-2 p-4 sm:p-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 shadow-sm",
              TONE_CLASS[toast.tone],
            )}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {toast.title ? (
                  <p className="text-sm font-semibold">{toast.title}</p>
                ) : null}
                <p className={cn("text-sm leading-5", toast.title && "mt-0.5")}>
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 opacity-70 transition hover:opacity-100"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }
  return context;
}
