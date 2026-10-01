import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Sparkle } from "./Sparkle";

/**
 * "Already paid?" entry point to /check-status.
 *
 * Shown under the pricing cards and on the Get Premium page — the two places a
 * returning customer lands when they are really asking "do I already have
 * this?". Deliberately quieter than the buy CTAs around it: it must never
 * compete with them for a first-time visitor's attention.
 */
export async function CheckStatusCard() {
  const t = await getTranslations("checkStatus");

  return (
    <section
      className="card flex flex-col gap-4 bg-accent-soft/40 p-6 sm:flex-row sm:items-center sm:justify-between"
      data-testid="check-status-card"
    >
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-[18px]">
          <Sparkle size={15} className="text-accent" />
          {t("bannerTitle")}
        </h3>
        <p className="mt-2 text-small text-ink-2">{t("bannerBody")}</p>
      </div>
      <Link
        href="/check-status"
        className="btn btn-secondary shrink-0 whitespace-nowrap"
        data-testid="link-check-status"
      >
        {t("bannerCta")}
      </Link>
    </section>
  );
}
