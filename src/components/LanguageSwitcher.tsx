"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

const LABEL: Record<Locale, string> = { en: "EN", bn: "বাং" };

/** Where the reader was looking, handed from the old locale to the new one. */
const ANCHOR_KEY = "dc-lang-anchor";
/** Long enough to survive the navigation, short enough not to fire later. */
const ANCHOR_TTL_MS = 4000;

type Anchor = { selector: string; top: number; at: number };

/** React's `useId` output — reshuffles between renders, so never an anchor. */
const GENERATED_ID = /^[«:]|_R_|^_r_/i;

function escapeValue(value: string): string {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}

/**
 * Remember the topmost on-screen landmark and how far down the viewport it
 * sat. `id` and `data-testid` are the same in both locales, so they survive
 * the switch — the translated text around them does not.
 */
function rememberAnchor() {
  try {
    if (window.scrollY <= 0) {
      sessionStorage.removeItem(ANCHOR_KEY);
      return;
    }
    // Only content counts: the header and footer are chrome, and the header is
    // sticky, so anything inside it sits at top 0 no matter where we are.
    const main = document.getElementById("main");
    if (!main) return;

    let best: { selector: string; top: number } | null = null;
    for (const el of main.querySelectorAll<HTMLElement>("[id], [data-testid]")) {
      const rect = el.getBoundingClientRect();
      if (rect.height === 0 || rect.top < 0 || rect.top > window.innerHeight) continue;
      if (best && rect.top >= best.top) continue;
      // The sticky header rides at top 0 forever — it tracks nothing.
      const position = getComputedStyle(el).position;
      if (position === "fixed" || position === "sticky") continue;
      const id = el.getAttribute("id");
      const testId = el.getAttribute("data-testid");
      const stableId = id && !GENERATED_ID.test(id) ? id : null;
      if (!stableId && !testId) continue;
      best = {
        selector: stableId ? `#${escapeValue(stableId)}` : `[data-testid="${escapeValue(testId!)}"]`,
        top: rect.top,
      };
    }
    if (best) sessionStorage.setItem(ANCHOR_KEY, JSON.stringify({ ...best, at: Date.now() } satisfies Anchor));
    else sessionStorage.removeItem(ANCHOR_KEY);
  } catch {
    // Private mode / blocked storage: `scroll={false}` still holds the offset.
  }
}

/** Put that landmark back under the reader's eye once the new locale paints. */
function useRestoreAnchor(locale: string) {
  useEffect(() => {
    const clear = () => {
      try {
        sessionStorage.removeItem(ANCHOR_KEY);
      } catch {
        // Nothing to clean up if storage is unavailable.
      }
    };

    let raw: string | null = null;
    try {
      // Deliberately not consumed on read: under StrictMode this effect runs,
      // tears down and runs again, and the second pass must still see it.
      raw = sessionStorage.getItem(ANCHOR_KEY);
    } catch {
      return;
    }
    if (!raw) return;

    let anchor: Anchor;
    try {
      anchor = JSON.parse(raw) as Anchor;
    } catch {
      clear();
      return;
    }
    if (!anchor?.selector || Date.now() - anchor.at > ANCHOR_TTL_MS) {
      clear();
      return;
    }

    const align = () => {
      const el = document.querySelector(anchor.selector);
      if (el) {
        const delta = el.getBoundingClientRect().top - anchor.top;
        if (Math.abs(delta) > 1) window.scrollBy(0, delta);
      }
      clear();
    };

    // Two frames: one for React to commit the translated DOM, one for layout.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(align);
    });
    // The Bengali face can land after that and reflow the page again.
    let stale = false;
    void document.fonts?.ready.then(() => {
      if (!stale) align();
    });

    return () => {
      stale = true;
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [locale]);
}

/**
 * Keeps the current page (and its query string) when switching language.
 *
 * The switch `replace`s the history entry rather than pushing one: changing
 * language is a preference, not a navigation step, so Back should return to
 * the page the reader came from — not to the same page in the old language.
 * It also keeps the reader's place, since the two locales set text at
 * different heights.
 */
export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  useRestoreAnchor(locale);

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
            replace
            scroll={false}
            onClick={active ? undefined : rememberAnchor}
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
