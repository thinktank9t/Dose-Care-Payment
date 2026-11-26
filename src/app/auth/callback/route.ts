import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabasePublicConfig } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/next-path";
import { OAUTH_NEXT_COOKIE } from "@/lib/auth/session";
import { routing } from "@/i18n/routing";

function sessionFromUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email?.split("@")[0] ||
    "";
  return {
    authId: user.id,
    email: user.email ?? null,
    name,
    avatarUrl:
      (typeof meta.avatar_url === "string" && meta.avatar_url) ||
      (typeof meta.picture === "string" && meta.picture) ||
      null,
  };
}

/** Ensure `public.users` has a row as soon as Google sign-in completes. */
async function ensureAppUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  try {
    const { getRepo } = await import("@/lib/data/repo");
    const repo = await getRepo();
    const session = sessionFromUser(user);
    const existing = await repo.getUserByAuthId(session.authId);
    if (!existing) {
      await repo.createUser({
        authId: session.authId,
        name: session.name,
        email: session.email,
        avatarUrl: session.avatarUrl,
      });
    }
  } catch {
    // Non-fatal: getCurrentUser() will create the row on the next protected page.
  }
}

/** Supabase OAuth (PKCE) return leg: exchange the code, set cookies, go on. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const fromQuery = searchParams.get("next");
  const fromCookie = request.cookies.get(OAUTH_NEXT_COOKIE)?.value;
  const next = safeNextPath(
    fromQuery || fromCookie,
    `/${routing.defaultLocale}/account`,
  );

  if (!code) {
    return NextResponse.redirect(`${origin}/${routing.defaultLocale}/sign-in?error=oauth`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  response.cookies.set(OAUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });

  const { url, anonKey } = supabasePublicConfig();
  const supabase = createServerClient(url, anonKey, {
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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/${routing.defaultLocale}/sign-in?error=oauth`);
  }
  if (data.user) {
    await ensureAppUser(data.user);
  }
  return response;
}
