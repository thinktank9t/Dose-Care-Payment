"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CONTRAST_COOKIE, THEME_CHOICES, THEME_COOKIE, type ThemeChoice } from "@/lib/theme";
import { Glyph } from "./Glyph";

const YEAR = 60 * 60 * 24 * 365;

function writeCookie(name: string, value: string | null) {
  const base = `${name}=${value ?? ""}; path=/; max-age=${value === null ? 0 : YEAR}; samesite=lax`;
  document.cookie = base;
}

/**
 * Light / dark / system, plus the high-contrast override. The server already
 * painted `data-theme` and `data-contrast` from the same cookies, so the first
 * frame matches; these buttons only update the attribute and the cookie.
 */
export function AppearanceControls({
  theme,
  contrast,
}: {
  theme: ThemeChoice;
  contrast: boolean;
}) {
  const t = useTranslations("nav");
  const [mode, setMode] = useState(theme);
  const [high, setHigh] = useState(contrast);

  const modeLabel =
    mode === "light" ? t("themeLight") : mode === "dark" ? t("themeDark") : t("themeSystem");

  function cycleTheme() {
    const next = THEME_CHOICES[(THEME_CHOICES.indexOf(mode) + 1) % THEME_CHOICES.length];
    setMode(next);
    writeCookie(THEME_COOKIE, next === "system" ? null : next);
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
  }

  function toggleContrast() {
    const next = !high;
    setHigh(next);
    writeCookie(CONTRAST_COOKIE, next ? "high" : null);
    if (next) document.documentElement.dataset.contrast = "high";
    else delete document.documentElement.dataset.contrast;
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t("appearance")}>
      <button
        type="button"
        onClick={cycleTheme}
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:text-ink"
        aria-label={`${t("theme")}: ${modeLabel}`}
        title={modeLabel}
        data-testid="theme-toggle"
        data-theme-choice={mode}
      >
        <Glyph name="sun" size={16} />
      </button>
      <button
        type="button"
        onClick={toggleContrast}
        className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-line transition-colors ${
          high ? "bg-accent-soft text-accent-ink" : "bg-surface text-ink-2 hover:text-ink"
        }`}
        aria-pressed={high}
        aria-label={high ? t("contrastHigh") : t("contrastStandard")}
        title={high ? t("contrastHigh") : t("contrastStandard")}
        data-testid="contrast-toggle"
      >
        <Glyph name="contrast" size={16} />
      </button>
    </div>
  );
}
