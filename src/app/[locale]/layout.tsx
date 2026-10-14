import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Fraunces, Inter, Noto_Sans_Bengali } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { CONTRAST_COOKIE, THEME_COOKIE, parseContrast, parseTheme } from "@/lib/theme";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LocaleGuard } from "@/components/LocaleGuard";
import "../globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-bengali",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t("premium"), template: t("titleTemplate", { title: "%s" }) },
    description: t("description"),
    alternates: {
      languages: { en: "/en", bn: "/bn" },
    },
    openGraph: { title: t("premium"), description: t("description"), type: "website" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const shared = { width: "device-width", initialScale: 1 } as const;
  if (theme === "light") return { ...shared, themeColor: "#F3F6F8" };
  if (theme === "dark") return { ...shared, themeColor: "#0B141A" };
  return {
    ...shared,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#F3F6F8" },
      { media: "(prefers-color-scheme: dark)", color: "#0B141A" },
    ],
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const jar = await cookies();
  const theme = parseTheme(jar.get(THEME_COOKIE)?.value);
  const contrast = parseContrast(jar.get(CONTRAST_COOKIE)?.value);

  return (
    <html
      lang={locale}
      data-theme={theme === "system" ? undefined : theme}
      data-contrast={contrast ? "high" : undefined}
      className={`${fraunces.variable} ${inter.variable} ${notoBengali.variable}`}
    >
      <body className="flex min-h-svh flex-col">
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={null}>
            <LocaleGuard />
          </Suspense>
          <Header />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
