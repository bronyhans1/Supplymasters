import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/config/env";
import type { Database } from "@/types/database";

/**
 * Request-scoped Supabase server client (React cache).
 * Dedupes cookie/client construction within one RSC/action request.
 * Never reuse across requests — cache is per-request in the App Router.
 */
export const createClient = cache(async () => {
  if (!env.hasPublicSupabaseConfig) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies cannot be set.
          // The proxy is responsible for refreshing sessions.
        }
      },
    },
  });
});
