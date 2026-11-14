import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/lib/auth/session";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Sparkle } from "./Sparkle";

/**
 * One 64px row at every width: logo on the left; Pricing and Get Premium (sm
 * and up), the language switch and Sign in / Open app on the right. Theme and
 * contrast live on Profile, so the row never has to wrap on a phone. Solid
 * background so content never shows through the single hairline.
 */
export async function Header() {
  const t = await getTranslations("nav");
  let signedIn = false;
  try {
    signedIn = Boolean(await getSession());
  } catch {
    signedIn = false;
  }
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        {t("skipToContent")}
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-2">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap font-heading text-[19px] text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
            <Sparkle size={16} />
          </span>
          <span>Dose Care</span>
        </Link>

        <nav className="flex min-w-0 items-center gap-2 sm:gap-3" aria-label={t("menu")}>
          <Link
            href="/premium#pricing"
            className="hidden min-h-11 items-center whitespace-nowrap px-2 text-[14px] font-medium text-ink-2 hover:text-ink sm:inline-flex"
          >
            {t("pricing")}
          </Link>
          <Link
            href="/get-premium"
            className="hidden min-h-11 items-center whitespace-nowrap px-2 text-[14px] font-medium text-accent-ink hover:underline sm:inline-flex"
            data-testid="nav-get-premium"
          >
            {t("getPremium")}
          </Link>
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
          {/* The way into the app from the public pages. */}
          <Link
            href={signedIn ? "/" : "/sign-in?next=%2F"}
            className="btn btn-secondary min-h-12 whitespace-nowrap px-4 text-[14px]"
            data-testid="nav-sign-in"
          >
            {signedIn ? t("openApp") : t("signIn")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
