import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabasePublicConfig } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/next-path";

/** Supabase OAuth (PKCE) return leg: exchange the code, set cookies, go on. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/en/account");

  if (!code) {
    return NextResponse.redirect(`${origin}/en/sign-in?error=oauth`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/en/sign-in?error=oauth`);
  }
  return response;
}
