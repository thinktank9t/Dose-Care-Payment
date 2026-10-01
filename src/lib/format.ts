import type { Locale } from "@/i18n/routing";

const DATE_LOCALE: Record<Locale, string> = { en: "en-GB", bn: "bn-BD" };

export function formatDate(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    dateStyle: "medium",
    timeZone: "Asia/Dhaka",
  }).format(d);
}

export function formatDateTime(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(d);
}

/** BDT is always shown as `৳ 1,234` (Latin digits) so it matches bKash. */
export function formatBdt(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "৳ —";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "৳ —";
  return `৳ ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
}

/** Short code the user types into bKash's "Reference" field. */
export function userReference(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 6).toUpperCase();
}
