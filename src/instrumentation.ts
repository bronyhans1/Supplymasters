/**
 * Next.js server instrumentation — runs once when a Node server instance starts.
 * Used for production environment fail-fast (FQA-006).
 * Skipped on Edge; build-time phases are ignored inside assertProductionRuntimeEnv.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { assertProductionRuntimeEnv } = await import("@/config/env");
  assertProductionRuntimeEnv(process.env);
}
