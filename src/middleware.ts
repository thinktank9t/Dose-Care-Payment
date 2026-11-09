import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { isFakeBackend } from "@/lib/env";

const intlMiddleware = createIntlMiddleware(routing);

/** Must match `FAKE_SESSION_COOKIE` in `src/lib/auth/session.ts`. */
const FAKE_SESSION_COOKIE = "dc_fake_session";

/**
 * Public paths under `/{locale}/…`. Everything else requires Google sign-in
 * (or the e2e fake session). `/auth/*` is already outside the matcher.
 */
const PUBLIC_PATH =
  /^\/(en|bn)\/(sign-in|privacy|terms|refund-policy)(?:\/|$)/;

function localeFromPath(pathname: string): string {
  const first = pathname.split("/")[1];
  return first === "en" || first === "bn" ? first : routing.defaultLocale;
}

function signInRedirect(request: NextRequest, locale: string) {
  const { pathname, search } = request.nextUrl;
  const nextPath = pathname.replace(/^\/(en|bn)/, "") || "/";
  const next = `${nextPath}${search}`;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/sign-in`;
  url.search = `?next=${encodeURIComponent(next === "/" ? "/" : next)}`;
  return NextResponse.redirect(url);
}

/**
 * Three jobs per request:
 * 1. next-intl: locale prefix. Unprefixed URLs go to Bangla.
 * 2. Supabase: refresh the auth session cookie.
 * 3. Gate the site: only sign-in + legal pages are public.
 */
export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATH.test(pathname);

  if (isFakeBackend()) {
    if (isPublic) return response;
    if (request.cookies.get(FAKE_SESSION_COOKIE)?.value) return response;
    return signInRedirect(request, localeFromPath(pathname));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Misconfigured deploy: fail closed except public pages.
    if (isPublic) return response;
    return signInRedirect(request, localeFromPath(pathname));
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublic) return response;
  if (user) return response;

  const redirect = signInRedirect(request, localeFromPath(pathname));
  // Keep any refreshed cookies from the session lookup.
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value);
  });
  return redirect;
}

export const config = {
  // Skip API/auth routes, Next internals and static files.
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
