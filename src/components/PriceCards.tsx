import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatBdt } from "@/lib/format";
import {
  bestValuePeriod,
  byDuration,
  fetchActivePlans,
  parseDuration,
  planDays,
  type ClaimPlan,
} from "@/lib/premium-claim";
import { Skeleton } from "./Skeleton";
import { Sparkle } from "./Sparkle";

/**
 * Shown while the plans query is in flight. Same grid and card height as the
 * real thing, so the prices drop in without shifting the page.
 */
export function PriceCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" role="status" aria-busy="true">
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-[232px]" />
      ))}
    </div>
  );
}

/** Periods that already have translated copy in the `plans` namespace. */
const NAMED_PERIODS = new Set(["monthly", "yearly"]);

export async function PriceCards() {
  const t = await getTranslations("plans");
  const tg = await getTranslations("getPremium");

  let plans: ClaimPlan[] = [];
  let failed = false;
  try {
    plans = await fetchActivePlans();
  } catch {
    // Never let a pricing lookup take the landing page down.
    failed = true;
  }

  if (failed || plans.length === 0) {
    return (
      <p className="card p-6 text-small text-ink-2" role="status">
        {failed ? tg("plansError") : tg("plansEmpty")}
      </p>
    );
  }

  const planName = (p: string) =>
    NAMED_PERIODS.has(p) ? t(p) : p.charAt(0).toUpperCase() + p.slice(1);

  const perLabel = (p: string) =>
    p === "monthly" ? t("perMonth") : p === "yearly" ? t("perYear") : null;

  const billedLabel = (plan: ClaimPlan) => {
    if (plan.period === "monthly") return t("billedMonthly");
    if (plan.period === "yearly") return t("billedOnce");
    const parsed = parseDuration(plan.duration);
    return parsed ? tg(`duration_${parsed.unit}`, { count: parsed.count }) : plan.duration;
  };

  const ctaLabel = (p: string) =>
    p === "monthly" ? t("subscribeMonthly") : p === "yearly" ? t("subscribeYearly") : tg("submit");

  const ordered = [...plans].sort(byDuration);
  const highlighted = bestValuePeriod(ordered);

  // What a longer plan saves against renewing the shortest one all the way.
  const baseline = ordered[0];
  const baselineRate = planDays(baseline) > 0 ? baseline.amount / planDays(baseline) : 0;
  const savingOn = (plan: ClaimPlan) => {
    const days = planDays(plan);
    if (!baselineRate || !days || plan.period === baseline.period) return 0;
    return Math.round(baselineRate * days - plan.amount);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ordered.map((plan) => {
        const highlight = plan.period === highlighted;
        const per = perLabel(plan.period);
        const saving = savingOn(plan);
        return (
          <article
            key={plan.period}
            className={`card flex flex-col gap-5 p-6 ${highlight ? "border-accent/40 ring-1 ring-accent/20" : ""}`}
            data-testid={`price-${plan.period}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2">
                <Sparkle size={16} className="text-accent" />
                {planName(plan.period)}
              </h3>
              {highlight ? <span className="pill bg-accent-soft text-accent-ink">{t("bestValue")}</span> : null}
            </div>

            <div>
              <p className="flex items-baseline gap-2">
                <span className="font-heading text-[38px] leading-none text-ink">
                  {formatBdt(plan.amount)}
                </span>
                {per ? <span className="text-small text-ink-2">{per}</span> : null}
              </p>
              {saving > 0 ? (
                <p className="mt-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-[12px] font-semibold text-accent-ink">
                  {t("savePerYear", { amount: formatBdt(saving) })}
                </p>
              ) : null}
            </div>

            <p className="text-small text-ink-2">{billedLabel(plan)}</p>

            <Link
              href={`/get-premium?plan=${encodeURIComponent(plan.period)}`}
              className={`btn ${highlight ? "btn-primary" : "btn-secondary"} mt-auto`}
            >
              {ctaLabel(plan.period)}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
