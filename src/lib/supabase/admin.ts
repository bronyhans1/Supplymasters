import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  formatMissingEnvError,
  missingAdminSupabaseEnvVars,
  resolveEnv,
} from "@/config/env";
import type { Database } from "@/types/database";

/**
 * Privileged server client using the Supabase secret key.
 * Bypasses RLS. Never import this module from Client Components.
 * Callers must perform explicit authorization checks before privileged work.
 *
 * Use only for Admin API / service_role RPCs (createUser, service_clear_must_change_password).
 * Do NOT call admin_set_user_role (or other is_admin()-gated RPCs) with this client —
 * those require the authenticated administrator session client so auth.uid() is set.
 */
export function createAdminClient() {
  const missing = missingAdminSupabaseEnvVars(process.env);
  if (missing.length > 0) {
    throw new Error(formatMissingEnvError(missing));
  }

  const { supabaseUrl, supabaseSecretKey } = resolveEnv(process.env);

  return createSupabaseClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
