import type { Locale } from "@/i18n/routing";

/** BCP 47 tags used for dates, clocks, and UI numbers. */
export const DATE_LOCALE: Record<Locale, string> = { en: "en-GB", bn: "bn-BD" };

/** Bangla UI uses Bengali digits; English stays Latin. */
const NUMBER_OPTS: Record<Locale, Intl.NumberFormatOptions> = {
  en: { maximumFractionDigits: 0 },
  bn: { maximumFractionDigits: 0, numberingSystem: "beng" },
};

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

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Locale-aware integer for ages, counts, streaks, calendar days, etc. */
export function formatNumber(
  value: number | string | null | undefined,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "";
  return new Intl.NumberFormat(DATE_LOCALE[locale], {
    ...NUMBER_OPTS[locale],
    ...options,
  }).format(n);
}

/**
 * Rewrite Latin digits in an already-translated string (ICU `#` plurals, etc.)
 * so Bangla UI never mixes Western numerals into copy.
 */
export function localizeDigits(text: string, locale: Locale): string {
  if (locale !== "bn") return text;
  return text.replace(/\d/g, (digit) => BN_DIGITS[Number(digit)] ?? digit);
}

/** Percent label with locale digits, e.g. `৮৫%` in Bangla. */
export function formatPercent(value: number, locale: Locale): string {
  return `${formatNumber(value, locale)}%`;
}

/** Display BDT with locale digits (`৳ ৩,২৯৯` in Bangla, `৳ 3,299` in English). */
export function formatBdt(
  amount: number | string | null | undefined,
  locale: Locale = "en",
): string {
  if (amount === null || amount === undefined || amount === "") return "৳ —";
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "৳ —";
  return `৳ ${new Intl.NumberFormat(DATE_LOCALE[locale], {
    ...NUMBER_OPTS[locale],
  }).format(n)}`;
}

/** Short code the user types into bKash's "Reference" field. */
export function userReference(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 6).toUpperCase();
}
