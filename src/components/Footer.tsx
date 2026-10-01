import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supportEmail } from "@/lib/env";

export async function Footer() {
  const t = await getTranslations("footer");
  const email = supportEmail();
  return (
    <footer className="mt-20 border-t border-line bg-bg-alt/50">
      <div className="container-page flex flex-col gap-6 py-10 text-small text-ink-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-heading text-[17px] text-ink">Dose Care</p>
          <p>{t("tagline")}</p>
          <p>
            {t.rich("support", {
              email,
              a: (chunks) => (
                <a href={`mailto:${email}`} className="text-accent-ink underline">
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legal">
          <Link href="/check-status" className="hover:text-ink">{t("checkStatus")}</Link>
          <Link href="/privacy" className="hover:text-ink">{t("privacy")}</Link>
          <Link href="/terms" className="hover:text-ink">{t("terms")}</Link>
          <Link href="/refund-policy" className="hover:text-ink">{t("refund")}</Link>
        </nav>
        <p className="text-ink-2">{t("rights", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
