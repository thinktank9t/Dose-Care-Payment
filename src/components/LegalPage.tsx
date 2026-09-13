import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { supportEmail } from "@/lib/env";
import { formatDate } from "@/lib/format";

type Kind = "privacy" | "terms" | "refund";

/** TODO: replace the draft bodies in messages/*.json with the final policy text. */
export async function LegalPage({ kind }: { kind: Kind }) {
  const t = await getTranslations("legal");
  const locale = (await getLocale()) as Locale;
  const email = supportEmail();
  return (
    <article className="container-page prose-legal max-w-3xl py-12">
      <h1>{t(`${kind}Title`)}</h1>
      <p className="text-body-lg">{t(`${kind}Intro`)}</p>
      <p>
        {t.rich(`${kind}Body`, {
          email,
              a: (chunks) => (
                <a href={`mailto:${email}`} className="text-accent-ink underline">
                  {chunks}
                </a>
              ),
        })}
      </p>
      <p className="text-small text-ink-3">{t("lastUpdated", { date: formatDate(new Date("2026-09-13"), locale) })}</p>
    </article>
  );
}
