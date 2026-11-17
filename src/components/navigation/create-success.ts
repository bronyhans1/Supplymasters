"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useNavigationProgress } from "@/components/navigation/NavigationProgress";
import { useToast } from "@/components/ui/ToastProvider";

export type CreateSuccessOptions = {
  /** Listing route (never a detail URL). */
  listHref: string;
  message: string;
};

/**
 * After a successful create write: show toast and navigate to the listing
 * with the orange NavigationProgress bar.
 *
 * Call only after the write pending state has been cleared (or is about to be
 * cleared in `finally`) so submit-button pending does not span the soft navigation.
 */
export function useCreateSuccessNavigation() {
  const router = useRouter();
  const toast = useToast();
  const nav = useNavigationProgress();

  return useCallback(
    ({ listHref, message }: CreateSuccessOptions) => {
      toast.success(message);
      nav.run(() => {
        router.push(listHref);
      });
    },
    [router, toast, nav],
  );
}

/**
 * Explicit pending flag for create writes.
 * Pending covers only the Server Action, not the subsequent list navigation.
 * A ref lock prevents duplicate submits before React re-renders.
 */
export function useCreateWritePending() {
  const [pending, setPending] = useState(false);
  const lockRef = useRef(false);

  const runWrite = useCallback(async <T,>(work: () => Promise<T>): Promise<T | undefined> => {
    if (lockRef.current) return undefined;
    lockRef.current = true;
    setPending(true);
    try {
      return await work();
    } finally {
      lockRef.current = false;
      setPending(false);
    }
  }, []);

  return { pending, runWrite };
}
