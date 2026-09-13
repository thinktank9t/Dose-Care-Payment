import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Sparkle } from "./Sparkle";

type Props = {
  signedIn: boolean;
  isAdmin: boolean;
};

export async function Header({ signedIn, isAdmin }: Props) {
  const t = await getTranslations("nav");
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        {t("skipToContent")}
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 font-heading text-[19px] text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
            <Sparkle size={16} />
          </span>
          <span>Dose Care</span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4" aria-label={t("menu")}>
          <Link href="/#pricing" className="hidden text-[14px] font-medium text-ink-2 hover:text-ink sm:inline">
            {t("pricing")}
          </Link>
          {isAdmin ? (
            <Link href="/admin/payments" className="hidden text-[14px] font-medium text-ink-2 hover:text-ink sm:inline">
              {t("admin")}
            </Link>
          ) : null}
          {signedIn ? (
            <Link href="/account" className="text-[14px] font-medium text-accent-ink hover:underline" data-testid="nav-account">
              {t("account")}
            </Link>
          ) : (
            <Link href="/sign-in" className="text-[14px] font-medium text-accent-ink hover:underline" data-testid="nav-sign-in">
              {t("signIn")}
            </Link>
          )}
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
