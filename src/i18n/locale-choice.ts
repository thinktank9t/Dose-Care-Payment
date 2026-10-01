import type { Locale } from "./routing";

/**
 * The language the reader picked with the switcher, for as long as this tab
 * stays open.
 *
 * Module scope on purpose. It has to outlive the component tree, which React
 * tears down and rebuilds every time the `[locale]` segment changes, and it has
 * to work when cookies are blocked. Nothing seeds it from storage: a reader who
 * has not touched the switcher has made no choice, so a link shared in Bangla
 * still opens in Bangla.
 */
let chosen: Locale | null = null;

export function rememberLocaleChoice(locale: Locale) {
  chosen = locale;
}

export function chosenLocale(): Locale | null {
  return chosen;
}
