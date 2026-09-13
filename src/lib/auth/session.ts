import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { isFakeBackend } from "@/lib/env";
import { getRepo } from "@/lib/data/repo";
import type { UserRow } from "@/lib/data/types";

/** The Google identity behind the request, straight from Supabase Auth. */
export type Session = {
  authId: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
};

export const FAKE_SESSION_COOKIE = "dc_fake_session";

async function readFakeSession(): Promise<Session | null> {
  const raw = (await cookies()).get(FAKE_SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof parsed.authId !== "string") return null;
    return {
      authId: parsed.authId,
      email: typeof parsed.email === "string" ? parsed.email : null,
      name: typeof parsed.name === "string" ? parsed.name : "",
      avatarUrl: null,
    };
  } catch {
    return null;
  }
}

async function readSupabaseSession(): Promise<Session | null> {
  const { supabaseServer } = await import("@/lib/supabase/server");
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
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

/** Memoised per request so layouts and pages share one lookup. */
export const getSession = cache(async (): Promise<Session | null> => {
  return isFakeBackend() ? readFakeSession() : readSupabaseSession();
});

/**
 * Session -> `public.users` row (`google_id = auth.uid()`). Creates the row
 * when the person has never used the app with this Google account, so the
 * purchase is honoured when the app adopts the row on its next sign-in.
 */
export const getCurrentUser = cache(
  async (): Promise<{ session: Session; user: UserRow } | null> => {
    const session = await getSession();
    if (!session) return null;
    const repo = await getRepo();
    const existing = await repo.getUserByAuthId(session.authId);
    const user =
      existing ??
      (await repo.createUser({
        authId: session.authId,
        name: session.name,
        email: session.email,
        avatarUrl: session.avatarUrl,
      }));
    return { session, user };
  },
);

export async function isAdminSession(session: Session | null): Promise<boolean> {
  if (!session?.email) return false;
  const repo = await getRepo();
  return repo.isAdmin(session.email);
}
