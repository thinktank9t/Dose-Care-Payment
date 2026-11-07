import { cookies } from "next/headers";
import { ProfileScreen } from "@/components/care/ProfileScreen";
import { CONTRAST_COOKIE, TEXT_COOKIE, THEME_COOKIE, parseContrast, parseText, parseTheme } from "@/lib/theme";

export default async function Page() {
  const jar = await cookies();
  return (
    <ProfileScreen
      theme={parseTheme(jar.get(THEME_COOKIE)?.value)}
      contrast={parseContrast(jar.get(CONTRAST_COOKIE)?.value)}
      scale={parseText(jar.get(TEXT_COOKIE)?.value)}
    />
  );
}
