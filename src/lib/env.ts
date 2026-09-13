/**
 * Central place for environment access. Public values are inlined by Next at
 * build time; secrets are only ever read on the server.
 */

export type BkashAccountType = "personal" | "merchant";
export type BkashMethod = "send_money" | "payment";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function supportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@example.com";
}

export function bkashConfig() {
  const accountType = process.env.NEXT_PUBLIC_BKASH_ACCOUNT_TYPE;
  const method = process.env.NEXT_PUBLIC_BKASH_METHOD;
  return {
    number: process.env.NEXT_PUBLIC_BKASH_NUMBER ?? "01XXXXXXXXX",
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

export function serviceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. It is required on the server.",
    );
  }
  return key;
}

export function supabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }
  return { url, anonKey };
}
