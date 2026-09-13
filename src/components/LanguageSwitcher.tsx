"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

const LABEL: Record<Locale, string> = { en: "EN", bn: "বাং" };

/** Keeps the current page (and its query string) when switching language. */
export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <nav aria-label={t("language")} className="flex items-center rounded-full border border-line bg-surface p-0.5">
      {locales.map((l) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={href}
            locale={l}
            hrefLang={l}
            aria-current={active ? "true" : undefined}
            aria-label={l === "en" ? t("english") : t("bangla")}
            data-testid={`lang-${l}`}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold tracking-wide transition-colors ${
              active ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:text-ink"
            }`}
          >
            {LABEL[l]}
          </Link>
        );
      })}
    </nav>
  );
}
