import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { isFakeBackend } from "@/lib/env";

const intlMiddleware = createIntlMiddleware(routing);

/**
 * Two jobs per request:
 * 1. next-intl: locale prefix, Accept-Language detection, NEXT_LOCALE cookie.
 * 2. Supabase: refresh the auth session cookie so server components always
 *    see a valid session (the "updateSession" pattern from @supabase/ssr).
 */
export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  if (isFakeBackend()) return response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refreshes the token if needed and writes the new cookies onto `response`.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Skip API/auth routes, Next internals and static files.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};

