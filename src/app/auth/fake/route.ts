import { NextResponse, type NextRequest } from "next/server";
import { isFakeBackend } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/next-path";
import { FAKE_SESSION_COOKIE } from "@/lib/auth/session";
import { encodeFakeSession } from "@/lib/auth/fake-identities";

/**
 * Test-only sign-in. Only mounted when E2E_FAKE_BACKEND=1 (404 otherwise).
 *   /auth/fake?as=user|admin&next=/en/pay   -> sets a fake session cookie
 *   /auth/fake?reset=1                       -> wipes the in-memory store
 */
export async function GET(request: NextRequest) {
  if (!isFakeBackend()) {
    return new NextResponse("Not found", { status: 404 });
  }
  const { searchParams, origin } = request.nextUrl;

  if (searchParams.get("reset") === "1") {
    const { resetFakeStore } = await import("@/lib/data/fake-repo");
    resetFakeStore();
    return NextResponse.json({ ok: true });
  }

  const as = searchParams.get("as") === "admin" ? "admin" : "user";
  const next = safeNextPath(searchParams.get("next"), "/en/account");
  const response = NextResponse.redirect(`${origin}${next}`);
  response.cookies.set(
    FAKE_SESSION_COOKIE,
    encodeFakeSession(as),
    { httpOnly: true, sameSite: "lax", path: "/" },
  );
  return response;
}
