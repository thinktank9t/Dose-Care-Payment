"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { isFakeBackend, siteUrl } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/next-path";
import { FAKE_SESSION_COOKIE, OAUTH_NEXT_COOKIE } from "@/lib/auth/session";
import { encodeFakeSession } from "@/lib/auth/fake-identities";

/** Origin the user actually opened (prod/dev), not a stale env localhost. */
async function oauthOrigin(): Promise<string> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "")
    .split(",")[0]
    .trim();
  if (host) {
    const loopback = /^(localhost|127\.0\.0\.1)(:|$)/i.test(host);
    const proto = (
      h.get("x-forwarded-proto") ?? (loopback ? "http" : "https")
    )
      .split(",")[0]
      .trim();
    return `${proto}://${host}`;
  }
  return siteUrl();
}

/** Google sign-in via Supabase Auth (PKCE). `next` is a locale-less path. */
export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const locale = await getLocale();
  const afterAuth = `/${locale}${next}`;
  // Exact callback URL (no query). Host from the live request so
  // www.dose-care.com never redirects to localhost after Google.
  // Supabase Redirect URLs must allow this origin; Google Cloud must allow
  // Supabase's /auth/v1/callback.
  const callback = `${await oauthOrigin()}/auth/callback`;

  const jar = await cookies();
  jar.set(OAUTH_NEXT_COOKIE, afterAuth, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  if (isFakeBackend()) {
    // Test-only: the "Google" button signs in a fixed test user.
    jar.set(FAKE_SESSION_COOKIE, encodeFakeSession("user"), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    redirect(afterAuth);
  }

  const { supabaseServer } = await import("@/lib/supabase/server");
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback,
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    redirect(`/${locale}/sign-in?error=oauth`);
  }
  redirect(data.url);
}

export async function signOut() {
  const locale = await getLocale();
  if (isFakeBackend()) {
    (await cookies()).delete(FAKE_SESSION_COOKIE);
  } else {
    const { supabaseServer } = await import("@/lib/supabase/server");
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
  }
  redirect(`/${locale}/sign-in`);
}
