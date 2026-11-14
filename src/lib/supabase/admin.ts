import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serviceRoleKey, supabasePublicConfig } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS — only ever import from server code that
 * has already established who the caller is.
 *
 * Not cached. Next bakes a direct `process.env.NAME` read into the build, and
 * a cached client would keep that stale key for the life of the server.
 */
export function supabaseAdmin(): SupabaseClient {
  const { url } = supabasePublicConfig();
  return createClient(url, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
