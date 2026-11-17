"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type NavigationProgressApi = {
  /** Mark that an intentional navigation has started (Link onNavigate, etc.). */
  begin: () => void
  /** Run a programmatic navigation inside a React transition and show progress. */
  run: (navigate: () => void) => void
  pending: boolean
};

const NavigationProgressContext = createContext<NavigationProgressApi | null>(
  null,
);

/**
 * App Router–compatible navigation progress.
 *
 * Starts only when navigation is intentionally begun (`begin` / `run`), never from
 * pathname watchers alone — avoiding false positives on mount or incidental URL sync.
 * Completes when the URL settles after a started navigation, when a wrapped
 * transition finishes, or after a safety timeout for interrupted/cancelled trips.
 */
export function NavigationProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const [active, setActive] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const startedRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    startedRef.current = false;
    clearTimers();
    // Brief complete pulse before hide (skipped under reduced motion via CSS).
    setActive(false);
  }, [clearTimers]);

  const begin = useCallback(() => {
    startedRef.current = true;
    setActive(true);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    // Never leave the bar stuck if navigation is cancelled mid-flight.
    safetyTimerRef.current = setTimeout(() => {
      finish();
    }, 12_000);
  }, [finish]);

  const run = useCallback(
    (navigate: () => void) => {
      begin();
      startTransition(() => {
        navigate();
      });
    },
    [begin],
  );

  // Complete after a navigation we started once the URL has settled.
  // Does not start progress — only clears intentional begins.
  useEffect(() => {
    if (!startedRef.current) return;
    // Defer slightly so rapid consecutive begins (click A then B) keep the bar up
    // until the final destination settles.
    if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    completeTimerRef.current = setTimeout(() => {
      if (startedRef.current) finish();
    }, 80);
  }, [pathname, searchKey, finish]);

  // Programmatic navigations: also clear when the React transition ends.
  const wasTransitionPending = useRef(false);
  useEffect(() => {
    if (wasTransitionPending.current && !isTransitionPending && startedRef.current) {
      finish();
    }
    wasTransitionPending.current = isTransitionPending;
  }, [isTransitionPending, finish]);

  // Browser back/forward: show progress for history traversals.
  useEffect(() => {
    function onPopState() {
      begin();
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [begin]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const pending = active || isTransitionPending;

  const api = useMemo<NavigationProgressApi>(
    () => ({ begin, run, pending }),
    [begin, run, pending],
  );

  return (
    <NavigationProgressContext.Provider value={api}>
      {children}
      <NavigationProgressBar visible={pending} />
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress(): NavigationProgressApi {
  const ctx = useContext(NavigationProgressContext);
  if (!ctx) {
    return {
      begin: () => {},
      run: (navigate) => navigate(),
      pending: false,
    };
  }
  return ctx;
}

function NavigationProgressBar({ visible }: { visible: boolean }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden"
      role="progressbar"
      aria-hidden={!visible}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={visible ? "Navigating" : undefined}
    >
      <span className="sr-only" aria-live="polite">
        {visible ? "Loading page" : ""}
      </span>
      <div
        className={cn(
          "h-full origin-left bg-accent shadow-[0_0_8px_rgba(217,154,54,0.45)]",
          visible
            ? "nav-progress-bar-active opacity-100"
            : "w-0 opacity-0",
        )}
      />
    </div>
  );
}
