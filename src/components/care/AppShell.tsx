"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Sparkle } from "@/components/Sparkle";
import { useCare } from "./store";

const PAYMENT = ["/get-premium", "/pay", "/account", "/check-status"];

function isPayment(path: string) {
  return PAYMENT.some((item) => path === item || path.startsWith(`${item}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("care");
  const nav = useTranslations("nav");
  const path = usePathname();
  const { ready, profile } = useCare();
  const onboarded = ready && profile.onboarded;
  const showNav = onboarded || isPayment(path);
  const showAdd = onboarded && (path === "/" || path === "/medicines");
  const premium = isPayment(path);

  const tabs = [
    { href: "/" as const, id: "today", label: t("tabs.today"), current: path === "/" || path.startsWith("/history") || path.startsWith("/reminder") },
    { href: "/medicines" as const, id: "medicines", label: t("tabs.medicines"), current: path.startsWith("/medicines") },
    { href: "/care" as const, id: "care", label: t("tabs.care"), current: path === "/care" || path.startsWith("/care/") },
    { href: "/get-premium" as const, id: "premium", label: t("tabs.premium"), current: premium },
    { href: "/profile" as const, id: "profile", label: t("tabs.profile"), current: path === "/profile" },
  ];

  return (
    <div className="flex min-h-svh flex-1 flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
        >
          {nav("skipToContent")}
        </a>
        <div className="container-page flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 py-2">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-heading text-[19px] text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <Sparkle size={16} />
            </span>
            Dose Care
          </Link>
          {showNav ? (
            <nav className="order-last flex w-full flex-wrap items-center gap-1 md:order-none md:w-auto md:flex-1" aria-label={t("tabs.label")}>
              {tabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  data-testid={tab.id === "premium" ? "nav-get-premium" : `tab-${tab.id}`}
                  aria-current={tab.current ? "page" : undefined}
                  className={`rounded-full px-3 py-2 text-[14px] font-medium ${
                    tab.current ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          ) : (
            <div className="flex-1" />
          )}
          <div className="ml-auto flex items-center gap-2">
            {showAdd ? (
              <Link href="/medicines/new" className="btn btn-primary btn-sm">
                {t("today.add")}
              </Link>
            ) : null}
            <Suspense fallback={null}>
              <LanguageSwitcher />
            </Suspense>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
