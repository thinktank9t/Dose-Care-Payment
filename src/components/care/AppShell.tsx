"use client";

import { Suspense, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Sparkle } from "@/components/Sparkle";
import { Icon } from "./chrome";
import { useCare } from "./store";

const PAYMENT = ["/get-premium", "/pay", "/account", "/check-status"];
const TAB_HREFS = ["/", "/medicines", "/care", "/get-premium", "/profile"] as const;

function isPayment(path: string) {
  return PAYMENT.some((item) => path === item || path.startsWith(`${item}/`));
}

/**
 * Wide screens: tabs sit in the sticky header. Phones: the header is one row
 * (logo + language) and the tabs move to a bottom bar with icon + label, like
 * the mobile app, so the sticky chrome stays small and the tabs stay in thumb
 * reach. "Add medicine" floats above the bar on phones.
 *
 * Tabs use a full `prefetch`: every page here is dynamic (cookies), so the
 * default prefetch fetches nothing and each switch would wait on a server
 * round trip. With the payload prefetched, the router switches tabs from its
 * cache. The care tabs render from local state, so a cached shell is never
 * stale for them; Profile re-reads its appearance settings on mount.
 */
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
    { href: "/" as const, id: "today", label: t("tabs.today"), icon: <Icon name="calendar" size={22} />, current: path === "/" || path.startsWith("/history") || path.startsWith("/reminder") },
    { href: "/medicines" as const, id: "medicines", label: t("tabs.medicines"), icon: <Icon name="pill" size={22} />, current: path.startsWith("/medicines") },
    { href: "/care" as const, id: "care", label: t("tabs.care"), icon: <Icon name="users" size={22} />, current: path === "/care" || path.startsWith("/care/") },
    { href: "/get-premium" as const, id: "premium", label: t("tabs.premium"), icon: <Sparkle size={20} />, current: premium },
    { href: "/profile" as const, id: "profile", label: t("tabs.profile"), icon: <Icon name="user" size={22} />, current: path === "/profile" },
  ];
  const testId = (id: string) => (id === "premium" ? "nav-get-premium" : `tab-${id}`);

  // The tab links live in this persistent shell, so their own prefetch fires
  // once, on first load: never for the page you started on, and not again
  // after the cached copy expires. Re-warm the other tabs after every switch,
  // once the browser is idle. Fresh entries are skipped, so this is cheap.
  const router = useRouter();
  useEffect(() => {
    if (!showNav) return;
    const warm = () => {
      for (const href of TAB_HREFS) if (href !== path) router.prefetch(href);
    };
    const idle = window.requestIdleCallback?.(warm, { timeout: 1500 });
    const timer = idle === undefined ? window.setTimeout(warm, 300) : undefined;
    return () => {
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [path, showNav, router]);

  return (
    <div className="flex min-h-svh flex-1 flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
        >
          {nav("skipToContent")}
        </a>
        <div className="container-page flex min-h-16 items-center gap-4 py-2">
          <Link href="/" className="flex shrink-0 items-center gap-2 font-heading text-[19px] text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <Sparkle size={16} />
            </span>
            Dose Care
          </Link>
          {showNav ? (
            <nav className="hidden flex-1 flex-wrap items-center gap-1 md:flex" aria-label={t("tabs.label")}>
              {tabs.map((tab) => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  prefetch
                  data-testid={testId(tab.id)}
                  aria-current={tab.current ? "page" : undefined}
                  className={`rounded-full px-3 py-2 text-[14px] font-medium ${
                    tab.current ? "bg-accent-soft text-accent-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {showAdd ? (
              <Link href="/medicines/new" className="btn btn-primary btn-sm hidden md:inline-flex">
                {t("today.add")}
              </Link>
            ) : null}
            <Suspense fallback={null}>
              <LanguageSwitcher />
            </Suspense>
          </div>
        </div>
      </header>

      <main
        id="main"
        className={`flex-1 ${
          showNav ? (showAdd ? "pb-[calc(9rem+env(safe-area-inset-bottom))]" : "pb-[calc(5rem+env(safe-area-inset-bottom))]") : ""
        } md:pb-0`}
      >
        {children}
      </main>

      {showAdd ? (
        <Link
          href="/medicines/new"
          className="btn btn-primary fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[var(--gutter)] z-20 shadow-[0_8px_24px_rgba(11,85,117,0.28)] md:hidden"
          data-testid="fab-add"
        >
          <Icon name="plus" size={20} strokeWidth={2} />
          {t("today.add")}
        </Link>
      ) : null}

      {showNav ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
          aria-label={t("tabs.label")}
        >
          <ul className="grid grid-cols-5">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <Link
                  href={tab.href}
                  prefetch
                  data-testid={`${testId(tab.id)}-mobile`}
                  aria-current={tab.current ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[12px] font-medium ${
                    tab.current ? "text-accent-ink" : "text-ink-2"
                  }`}
                >
                  <span
                    className={`flex h-8 w-14 items-center justify-center rounded-full ${tab.current ? "bg-accent-soft" : ""}`}
                    aria-hidden
                  >
                    {tab.icon}
                  </span>
                  <span className="max-w-full truncate">{tab.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
