"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Icon } from "./chrome";
import { useCare } from "./store";

const PAYMENT = ["/get-premium", "/pay", "/account", "/check-status"];

function isPayment(path: string) {
  return PAYMENT.some((item) => path === item || path.startsWith(`${item}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("care");
  const path = usePathname();
  const { ready, profile } = useCare();
  const homeReady = path === "/" && ready && profile.onboarded;
  const showNav =
    homeReady || path === "/medicines" || path === "/care" || path === "/profile" || isPayment(path);
  const showFab = homeReady || path === "/medicines";
  const premium = isPayment(path);

  const tabs = [
    { href: "/" as const, id: "today", icon: "sun" as const, label: t("tabs.today"), current: path === "/" },
    { href: "/medicines" as const, id: "medicines", icon: "capsule" as const, label: t("tabs.medicines"), current: path === "/medicines" },
    { href: "/care" as const, id: "care", icon: "users" as const, label: t("tabs.care"), current: path === "/care" },
    { href: "/get-premium" as const, id: "premium", icon: "star" as const, label: t("tabs.premium"), current: premium },
    { href: "/profile" as const, id: "profile", icon: "user" as const, label: t("tabs.profile"), current: path === "/profile" },
  ];

  return (
    <div className="flex min-h-svh flex-1 justify-center bg-bg">
      <div className={`relative flex w-full max-w-[440px] flex-col border-line md:border-x ${showNav ? "pb-28" : ""}`}>
        {premium ? (
          <div className="flex justify-end px-4 pt-3">
            <Suspense fallback={null}>
              <LanguageSwitcher />
            </Suspense>
          </div>
        ) : null}
        <main id="main" className="flex-1">
          {children}
        </main>
        {showNav ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center">
            <div className="pointer-events-auto relative w-full max-w-[440px]">
              {showFab ? (
                <Link
                  href="/medicines/new"
                  aria-label={t("today.add")}
                  className="absolute bottom-full right-4 mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_8px_20px_rgba(11,85,117,0.28)]"
                >
                  <Icon name="plus" size={26} strokeWidth={1.8} />
                </Link>
              ) : null}
              <nav className="grid grid-cols-5 border-t border-line bg-surface/95 px-1 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] backdrop-blur" aria-label={t("tabs.label")}>
                {tabs.map((tab) => (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    data-testid={tab.id === "premium" ? "nav-get-premium" : `tab-${tab.id}`}
                    aria-current={tab.current ? "page" : undefined}
                    className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium ${
                      tab.current ? "bg-accent-soft text-accent-ink" : "text-ink-3"
                    }`}
                  >
                    <Icon name={tab.icon} size={20} />
                    <span className="max-w-full truncate px-0.5">{tab.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
