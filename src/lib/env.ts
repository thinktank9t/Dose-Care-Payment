/**
 * Central place for environment access. Public values are inlined by Next at
 * build time; secrets are only ever read on the server.
 */

export type BkashAccountType = "personal" | "merchant";
export type BkashMethod = "send_money" | "payment";

function stripSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLoopback(hostOrUrl: string): boolean {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(hostOrUrl);
}

/**
 * Canonical public site URL from env / Vercel. For Google OAuth redirects use
 * the request Host in the server action — never rely on a localhost default.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && !(process.env.VERCEL && isLoopback(configured))) {
    return stripSlash(configured);
  }
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) return stripSlash(`https://${vercelProd}`);
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return stripSlash(`https://${vercelUrl}`);
  return stripSlash(configured || "http://localhost:3000");
}

export function supportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@dose-care.com";
}

/**
 * Stand-in listing used until the Android app is published. It is a real,
 * well-formed Play Store URL so the QR code on the landing page encodes
 * something scannable — it just does not resolve to a listing yet.
 */
export const PLAY_STORE_PLACEHOLDER =
  "https://play.google.com/store/apps/details?id=com.dosecare.app";

/**
 * Where "Get it on Google Play" points. Set NEXT_PUBLIC_PLAY_STORE_URL once
 * the listing is live and both the button and the QR code follow — there is
 * nothing else to change.
 */
export function playStore(): { url: string; isPlaceholder: boolean } {
  const url = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim();
  return url
    ? { url, isPlaceholder: false }
    : { url: PLAY_STORE_PLACEHOLDER, isPlaceholder: true };
}

export function bkashConfig() {
  const accountType = process.env.NEXT_PUBLIC_BKASH_ACCOUNT_TYPE;
  const method = process.env.NEXT_PUBLIC_BKASH_METHOD;
  return {
    // Empty when unset: the pay page then refuses to show payment steps.
    number: process.env.NEXT_PUBLIC_BKASH_NUMBER?.trim() || "",
    accountType: (accountType === "merchant"
      ? "merchant"
      : "personal") as BkashAccountType,
    method: (method === "payment" ? "payment" : "send_money") as BkashMethod,
  };
}

/**
 * Test-only in-memory backend. Refused outright on a production Vercel
 * deployment so a stray env var can never disable real auth.
 */
export function isFakeBackend(): boolean {
  if (process.env.E2E_FAKE_BACKEND !== "1") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}

/**
 * Read at request time. A direct `process.env.NAME` access is baked into the
 * server bundle at build, so a later Vercel env change never reaches production.
 */
function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function serviceRoleKey(): string {
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It is required on the server.",
    );
  }
  return key;
}

export function supabasePublicConfig() {
  // Must stay literal `process.env.NEXT_PUBLIC_…` reads: Next only inlines
  // public values into browser code when written out like this. A dynamic
  // read (readEnv) is always empty in the browser, which broke every
  // client-side Supabase call (e.g. the plan list on Get Premium).
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }
  return { url, anonKey };
}
