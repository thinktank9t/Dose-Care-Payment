import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bdtPrices, USD_PRICES, type PlanPeriod } from "@/lib/plans";
import { formatBdt, formatUsd } from "@/lib/format";
import { Sparkle } from "./Sparkle";

type Props = { signedIn: boolean };

export async function PriceCards({ signedIn }: Props) {
  const t = await getTranslations("plans");
  const bdt = bdtPrices();
  const target = (p: PlanPeriod) => (signedIn ? `/pay?plan=${p}` : `/sign-in?next=${encodeURIComponent(`/pay?plan=${p}`)}`);

  const cards: { period: PlanPeriod; highlight: boolean }[] = [
    { period: "monthly", highlight: false },
    { period: "yearly", highlight: true },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map(({ period, highlight }) => (
        <article
          key={period}
          className={`card flex flex-col gap-5 p-6 ${highlight ? "border-accent/40 ring-1 ring-accent/20" : ""}`}
          data-testid={`price-${period}`}
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2">
              <Sparkle size={16} className="text-accent" />
              {t(period)}
            </h3>
            {highlight ? <span className="pill bg-accent-soft text-accent-ink">{t("bestValue")}</span> : null}
          </div>
          <div>
            {bdt[period] > 0 ? (
              <p className="font-heading text-[34px] leading-none text-ink">{formatBdt(bdt[period])}</p>
            ) : (
              <p className="font-heading text-[22px] leading-tight text-ink-2">{t("bdtUnset")}</p>
            )}
            <p className="mt-2 text-small text-ink-2">
              {period === "monthly" ? t("perMonth") : t("perYear")} · {t("usdReference", { usd: formatUsd(USD_PRICES[period]) })}
            </p>
          </div>
          <p className="text-small text-ink-2">{period === "monthly" ? t("billedMonthly") : t("billedOnce")}</p>
          <Link href={target(period)} className={`btn ${highlight ? "btn-primary" : "btn-secondary"} mt-auto`}>
            {period === "monthly" ? t("subscribeMonthly") : t("subscribeYearly")}
          </Link>
        </article>
      ))}
    </div>
  );
}
