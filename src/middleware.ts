import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { isFakeBackend } from "@/lib/env";

const intlMiddleware = createIntlMiddleware(routing);

/** Must match `FAKE_SESSION_COOKIE` in `src/lib/auth/session.ts`. */
const FAKE_SESSION_COOKIE = "dc_fake_session";

/**
 * Pages that need Google sign-in (or the e2e fake session): the app and the
 * account/payment pages. Everything else is public: the landing page, sign-in,
 * legal pages, and unknown paths, which must reach the 404 page instead of
 * bouncing to sign-in. Add any new signed-in route here; pages that read
 * private data also check the session on the server.
 * `/auth/*` is already outside the matcher.
 */
const PROTECTED_PATH =
  /^\/(en|bn)(?:\/?$|\/(?:medicines|care|history|prescriptions|profile|reminder|account|pay|get-premium|check-status|admin)(?:\/|$))/;

/** The app home. Signed-out visitors get the public landing page instead. */
const HOME_PATH = /^\/(en|bn)\/?$/;

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

/** Signed out: the home page goes to the landing page, anything else to sign-in. */
function signedOutRedirect(request: NextRequest, locale: string) {
  if (!HOME_PATH.test(request.nextUrl.pathname)) return signInRedirect(request, locale);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/premium`;
  url.search = "";
  return NextResponse.redirect(url);
}

/**
 * Three jobs per request:
 * 1. next-intl: locale prefix. Unprefixed URLs go to Bangla.
 * 2. Supabase: refresh the auth session cookie.
 * 3. Gate the app and payment pages (see PROTECTED_PATH).
 */
export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const { pathname } = request.nextUrl;
  const isPublic = !PROTECTED_PATH.test(pathname);

  if (isFakeBackend()) {
    if (isPublic) return response;
    if (request.cookies.get(FAKE_SESSION_COOKIE)?.value) return response;
    return signedOutRedirect(request, localeFromPath(pathname));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    // Misconfigured deploy: fail closed except public pages.
    if (isPublic) return response;
    return signedOutRedirect(request, localeFromPath(pathname));
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

  // getClaims() verifies the JWT locally against the project's cached public
  // key (ES256), so a page load no longer waits on a Supabase Auth round trip.
  // It still refreshes an expiring session, like getUser() did.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  if (isPublic) return response;
  if (user) return response;

  const redirect = signedOutRedirect(request, localeFromPath(pathname));
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
