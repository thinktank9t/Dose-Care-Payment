"use client";

import {
  CONTRAST_COOKIE,
  TEXT_COOKIE,
  THEME_COOKIE,
  type TextScale,
  type ThemeChoice,
} from "@/lib/theme";

const YEAR = 60 * 60 * 24 * 365;

function writeCookie(name: string, value: string | null) {
  document.cookie = `${name}=${value ?? ""}; path=/; max-age=${value === null ? 0 : YEAR}; samesite=lax`;
}

export function applyTheme(next: ThemeChoice) {
  writeCookie(THEME_COOKIE, next === "system" ? null : next);
  if (next === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
}

export function applyContrast(high: boolean) {
  writeCookie(CONTRAST_COOKIE, high ? "high" : null);
  if (high) document.documentElement.dataset.contrast = "high";
  else delete document.documentElement.dataset.contrast;
}

/** 1 / 1.15 / 1.3, the same steps as the app's text-size control. */
export function applyTextScale(scale: TextScale) {
  writeCookie(TEXT_COOKIE, scale === "1" ? null : scale);
  document.documentElement.style.fontSize = scale === "1" ? "" : `${Number(scale) * 100}%`;
}
