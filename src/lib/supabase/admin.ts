import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serviceRoleKey, supabasePublicConfig } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS — only ever import from server code that
 * has already established who the caller is.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const { url } = supabasePublicConfig();
  cached = createClient(url, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
