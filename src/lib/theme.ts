/** Appearance cookies. Absent theme means follow the OS ("System"). */
export const THEME_COOKIE = "dc-theme";
export const CONTRAST_COOKIE = "dc-contrast";
export const TEXT_COOKIE = "dc-text";

export const TEXT_SCALES = ["1", "1.15", "1.3"] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export function parseText(value: string | undefined): TextScale {
  if (value === "1.15" || value === "1.3") return value;
  return "1";
}

export const THEME_CHOICES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

export function parseTheme(value: string | undefined): ThemeChoice {
  if (value === "light" || value === "dark") return value;
  return "system";
}

export function parseContrast(value: string | undefined): boolean {
  return value === "high";
}
