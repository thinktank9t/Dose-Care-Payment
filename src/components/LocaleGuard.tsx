"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { chosenLocale } from "@/i18n/locale-choice";
import type { Locale } from "@/i18n/routing";

/**
 * Keeps the chosen language in force across the whole session.
 *
 * The locale lives in the URL, so every history entry carries the language it
 * was visited in. Go Back past a language switch and the browser returns to a
 * page in the old one — and the App Router serves it from its client cache, so
 * no request is made and nothing on the server gets a say.
 *
 * This watches what actually rendered. If the reader has picked a language and
 * the page comes up in the other one, it rewrites the URL to match, with
 * `replace` so the corrected entry takes the stale one's place rather than
 * stacking on top of it. Without a choice on record it never acts, which is
 * what leaves shared links and bookmarks in the language they were written in.
 */
export function LocaleGuard() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const choice = chosenLocale();
    if (!choice || choice === locale) return;

    const query = search.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      locale: choice,
      scroll: false,
    });
  }, [locale, pathname, search, router]);

  return null;
}
