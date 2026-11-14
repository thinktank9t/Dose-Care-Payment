"use client";

import {
  CONTRAST_COOKIE,
  TEXT_COOKIE,
  THEME_COOKIE,
  type TextScale,
  type ThemeChoice,
} from "@/lib/theme";

const YEAR = 60 * 60 * 24 * 365;

/** Fired on window whenever the theme changes, so every control stays in sync. */
export const THEME_EVENT = "dc:theme";
/** Fired after any appearance change (theme, contrast, text size). See AppearanceSync. */
export const APPEARANCE_EVENT = "dc:appearance";

function announce() {
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}

/** Page background per theme, for the browser chrome (theme-color). */
const THEME_BG = { light: "#F3F6F8", dark: "#0B141A" } as const;

function writeCookie(name: string, value: string | null) {
  document.cookie = `${name}=${value ?? ""}; path=/; max-age=${value === null ? 0 : YEAR}; samesite=lax`;
}

/** "light" or "dark" as the page actually looks right now. */
export function effectiveTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(next: ThemeChoice) {
  writeCookie(THEME_COOKIE, next === "system" ? null : next);
  if (next === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;
  const bg = THEME_BG[effectiveTheme()];
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute("content", bg));
  window.dispatchEvent(new CustomEvent<ThemeChoice>(THEME_EVENT, { detail: next }));
  announce();
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

/**
 * Change theme with a soft reveal: the new theme grows out of `origin` (the
 * button that was pressed) as a circle, via the View Transitions API. Browsers
 * without it get a short colour cross-fade instead. With reduced motion the
 * change is instant.
 */
export function switchTheme(next: ThemeChoice, origin?: { x: number; y: number }) {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as ViewTransitionDoc;

  if (reduce) {
    applyTheme(next);
    return;
  }

  if (typeof doc.startViewTransition !== "function") {
    root.classList.add("theme-fade");
    applyTheme(next);
    window.setTimeout(() => root.classList.remove("theme-fade"), 320);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  root.classList.add("theme-switching");
  const transition = doc.startViewTransition(() => applyTheme(next));
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 560, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
  transition.finished.finally(() => root.classList.remove("theme-switching"));
}

export function applyContrast(high: boolean) {
  writeCookie(CONTRAST_COOKIE, high ? "high" : null);
  if (high) document.documentElement.dataset.contrast = "high";
  else delete document.documentElement.dataset.contrast;
  announce();
}

/** 1 / 1.15 / 1.3, the same steps as the app's text-size control. */
export function applyTextScale(scale: TextScale) {
  writeCookie(TEXT_COOKIE, scale === "1" ? null : scale);
  document.documentElement.style.fontSize = scale === "1" ? "" : `${Number(scale) * 100}%`;
  announce();
}
