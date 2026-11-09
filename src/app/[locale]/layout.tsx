import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Fraunces, Inter, Noto_Sans_Bengali } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";
import { CONTRAST_COOKIE, TEXT_COOKIE, THEME_COOKIE, parseContrast, parseText, parseTheme } from "@/lib/theme";
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
  // Preload on every locale so EN→BN does not flash fallback glyphs.
  display: "swap",
  preload: true,
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
  const text = parseText(jar.get(TEXT_COOKIE)?.value);

  return (
    <html
      lang={locale}
      data-theme={theme === "system" ? undefined : theme}
      data-contrast={contrast ? "high" : undefined}
      className={`${fraunces.variable} ${inter.variable} ${notoBengali.variable}`}
      style={text === "1" ? undefined : { fontSize: `${Number(text) * 100}%` }}
    >
      <body className="flex min-h-svh flex-col">
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={null}>
            <LocaleGuard />
          </Suspense>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
