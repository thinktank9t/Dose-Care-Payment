/** Appearance cookies. Absent theme means follow the OS ("System"). */
export const THEME_COOKIE = "dc-theme";
export const CONTRAST_COOKIE = "dc-contrast";

export const THEME_CHOICES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

export function parseTheme(value: string | undefined): ThemeChoice {
  if (value === "light" || value === "dark") return value;
  return "system";
}

export function parseContrast(value: string | undefined): boolean {
  return value === "high";
}
