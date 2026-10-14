import { Suspense } from "react";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CONTRAST_COOKIE, THEME_COOKIE, parseContrast, parseTheme } from "@/lib/theme";
import { AppearanceControls } from "./AppearanceControls";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Sparkle } from "./Sparkle";

export async function Header() {
  const t = await getTranslations("nav");
  const jar = await cookies();
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  const contrast = parseContrast(jar.get(CONTRAST_COOKIE)?.value);
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        {t("skipToContent")}
      </a>
      <div className="container-page flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-heading text-[19px] text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
            <Sparkle size={16} />
          </span>
          <span>Dose Care</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4" aria-label={t("menu")}>
          <Link href="/#pricing" className="hidden text-[14px] font-medium text-ink-2 hover:text-ink sm:inline">
            {t("pricing")}
          </Link>
          {/* Sign-in / Account / Admin links are intentionally not shown.
              Those routes still exist and work; they are just unlinked. */}
          <Link
            href="/get-premium"
            className="hidden whitespace-nowrap text-[14px] font-medium text-accent-ink hover:underline min-[360px]:inline"
            data-testid="nav-get-premium"
          >
            {t("getPremium")}
          </Link>
          <AppearanceControls theme={theme} contrast={contrast} />
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
