import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ProfileScreen } from "@/components/care/ProfileScreen";
import { getSession } from "@/lib/auth/session";
import { CONTRAST_COOKIE, TEXT_COOKIE, THEME_COOKIE, parseContrast, parseText, parseTheme } from "@/lib/theme";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) {
    redirect({ href: "/sign-in?next=%2Fprofile", locale });
    return null;
  }

  const jar = await cookies();
  return (
    <ProfileScreen
      theme={parseTheme(jar.get(THEME_COOKIE)?.value)}
      contrast={parseContrast(jar.get(CONTRAST_COOKIE)?.value)}
      scale={parseText(jar.get(TEXT_COOKIE)?.value)}
    />
  );
}
