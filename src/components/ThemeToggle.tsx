"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { THEME_EVENT, effectiveTheme, switchTheme } from "@/lib/appearance";
import type { ThemeChoice } from "@/lib/theme";
import { Icon } from "./care/chrome";

/**
 * One-tap light/dark switch for the headers. Shows the theme you will get
 * (moon in light, sun in dark). "System" stays available on Profile; this
 * button sets an explicit choice. Listens for changes made elsewhere (Profile)
 * so the icon never goes stale.
 */
export function ThemeToggle({ initial }: { initial: ThemeChoice }) {
  const t = useTranslations("nav");
  // The server can't know what "system" resolves to; assume light until mounted.
  const [mode, setMode] = useState<"light" | "dark">(initial === "dark" ? "dark" : "light");

  useEffect(() => {
    const sync = () => setMode(effectiveTheme());
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    window.addEventListener(THEME_EVENT, sync);
    media.addEventListener("change", sync);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      media.removeEventListener("change", sync);
    };
  }, []);

  const next = mode === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        switchTheme(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:text-ink"
      aria-label={next === "dark" ? t("toDark") : t("toLight")}
      title={next === "dark" ? t("toDark") : t("toLight")}
      data-testid="theme-toggle"
    >
      <Icon name={next === "dark" ? "moon" : "sun"} size={20} />
    </button>
  );
}
