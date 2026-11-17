/**
 * Application environment configuration.
 *
 * Public Supabase values may be read from Client and Server Components.
 * SUPABASE_SECRET_KEY is server-only (never NEXT_PUBLIC_) — privileged
 * fail-fast validation runs via assertProductionRuntimeEnv (instrumentation /
 * admin client), not at shared module import time, so browser bundles never
 * require the secret.
 */

export const ENV_VAR = {
  supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
  supabasePublishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  supabaseSecretKey: "SUPABASE_SECRET_KEY",
} as const;

/** Subset of process.env used by resolve/assert helpers (injectable for tests). */
export type EnvSource = {
  NODE_ENV?: string;
  NEXT_PHASE?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
};

export type ResolvedEnv = {
  nodeEnv: string;
  isProduction: boolean;
  /** True while `next build` / export is collecting output — not a live server. */
  isProductionBuild: boolean;
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  hasPublicSupabaseConfig: boolean;
  hasSecretKey: boolean;
};

function read(value: string | undefined): string {
  return value?.trim() ?? "";
}

/**
 * Next sets NEXT_PHASE during build/export. Runtime `next start` does not.
 * Skipping validation here keeps `npm run build` working without treating
 * build-time placeholders as production runtime credentials.
 */
export function isNextProductionBuild(source: EnvSource): boolean {
  const phase = source.NEXT_PHASE ?? "";
  return phase === "phase-production-build" || phase === "phase-export";
}

export function resolveEnv(source: EnvSource = process.env): ResolvedEnv {
  const nodeEnv = source.NODE_ENV ?? "development";
  const supabaseUrl = read(source.NEXT_PUBLIC_SUPABASE_URL);
  const supabasePublishableKey = read(source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const supabaseSecretKey = read(source.SUPABASE_SECRET_KEY);

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    isProductionBuild: isNextProductionBuild(source),
    supabaseUrl,
    supabasePublishableKey,
    supabaseSecretKey,
    hasPublicSupabaseConfig: supabaseUrl !== "" && supabasePublishableKey !== "",
    hasSecretKey: supabaseSecretKey !== "",
  };
}

/** Public keys required for authenticated browser + server Supabase clients. */
export function missingPublicSupabaseEnvVars(source: EnvSource): string[] {
  const missing: string[] = [];
  if (!read(source.NEXT_PUBLIC_SUPABASE_URL)) {
    missing.push(ENV_VAR.supabaseUrl);
  }
  if (!read(source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    missing.push(ENV_VAR.supabasePublishableKey);
  }
  return missing;
}

/** Secret + public keys required for createAdminClient / privileged Auth Admin API. */
export function missingAdminSupabaseEnvVars(source: EnvSource): string[] {
  const missing = missingPublicSupabaseEnvVars(source);
  if (!read(source.SUPABASE_SECRET_KEY)) {
    missing.push(ENV_VAR.supabaseSecretKey);
  }
  return missing;
}

/**
 * Full production runtime set: public clients + privileged admin operations.
 * Bootstrap-only secrets (SETUP_BOOTSTRAP_*) are intentionally excluded.
 */
export function missingProductionRuntimeEnvVars(source: EnvSource): string[] {
  return missingAdminSupabaseEnvVars(source);
}

/** Safe error text — variable names only, never values. */
export function formatMissingEnvError(missing: string[]): string {
  return (
    `Missing required environment variable(s): ${missing.join(", ")}. ` +
    "Set them in the runtime environment before starting the server. " +
    "Secret values are never logged."
  );
}

/**
 * Fail-fast for live production servers.
 * No-op in development and during Next production build/export.
 */
export function assertProductionRuntimeEnv(source: EnvSource = process.env): void {
  const nodeEnv = source.NODE_ENV ?? "development";
  if (nodeEnv !== "production") return;
  if (isNextProductionBuild(source)) return;

  const missing = missingProductionRuntimeEnvVars(source);
  if (missing.length === 0) return;

  throw new Error(formatMissingEnvError(missing));
}

/**
 * Soft-resolved env for shared imports (browser + server).
 * Does not throw on import — production fail-fast is explicit via
 * assertProductionRuntimeEnv / createAdminClient.
 */
export const env = resolveEnv(process.env);
