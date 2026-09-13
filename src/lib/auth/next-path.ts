/**
 * Only ever redirect to a same-origin path. Anything else (absolute URLs,
 * protocol-relative `//evil`, backslashes) falls back to `/account`.
 */
export function safeNextPath(raw: string | null | undefined, fallback = "/account"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  if (/^\/(?:api|auth)(?:\/|$)/.test(raw)) return fallback;
  return raw;
}
