import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublicConfig } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Plain anon client, safe on the server and in the browser.
 *
 * Unlike `supabaseServer()` this one is not bound to the auth cookies: the
 * Get Premium page identifies the user by the email they type, so it must not
 * carry a session. Only the publishable key is ever used here.
 */
export function supabaseAnon(): SupabaseClient {
  if (!cached) {
    const { url, anonKey } = supabasePublicConfig();
    cached = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
