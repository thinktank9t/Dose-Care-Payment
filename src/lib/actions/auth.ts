"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { isFakeBackend, siteUrl } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/next-path";
import { FAKE_SESSION_COOKIE } from "@/lib/auth/session";
import { encodeFakeSession } from "@/lib/auth/fake-identities";

/** Google sign-in via Supabase Auth (PKCE). `next` is a locale-less path. */
export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(String(formData.get("next") ?? ""));
  const locale = await getLocale();
  const callback = `${siteUrl()}/auth/callback?next=${encodeURIComponent(`/${locale}${next}`)}`;

  if (isFakeBackend()) {
    // Test-only: the "Google" button signs in a fixed test user.
    (await cookies()).set(FAKE_SESSION_COOKIE, encodeFakeSession("user"), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    redirect(`/${locale}${next}`);
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
  redirect(`/${locale}`);
}
