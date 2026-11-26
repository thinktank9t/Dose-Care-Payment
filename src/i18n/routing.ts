import { defineRouting } from "next-intl/routing";

export const locales = ["en", "bn"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "bn",
  // Bangla is the default even when the browser asks for English.
  // A reader who picks English still stays on /en; only an unprefixed URL
  // falls back here.
  localeDetection: false,
  localePrefix: "always",
  localeCookie: {
    name: "NEXT_LOCALE",
    maxAge: 60 * 60 * 24 * 365,
  },
});
