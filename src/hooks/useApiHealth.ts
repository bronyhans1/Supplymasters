"use client";

import { useEffect, useState } from "react";
import type { HealthResponse } from "@/types/api";

export type ApiHealthState = "checking" | "online" | "offline";

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function useApiHealth(): ApiHealthState {
  const [state, setState] = useState<ApiHealthState>("checking");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/health", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          setState("offline");
          return;
        }

        const health = (await response.json()) as HealthResponse;
        setState(health.status === "ok" ? "online" : "offline");
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }

        setState("offline");
      });

    return () => {
      controller.abort();
    };
  }, []);

  return state;
}
