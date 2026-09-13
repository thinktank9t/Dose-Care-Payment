import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepo } from "@/lib/data/repo";
import { bkashConfig } from "@/lib/env";
import { bdtPrices, isPlanPeriod, type PlanPeriod } from "@/lib/plans";
import { planStatus } from "@/lib/plan-status";
import { formatDate, userReference } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import { PaymentFlow } from "@/components/PaymentFlow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pay");
  return { title: t("title") };
}

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { plan } = await searchParams;

  const current = await getCurrentUser();
  if (!current) {
    const next = `/pay${isPlanPeriod(plan) ? `?plan=${plan}` : ""}`;
    redirect({ href: `/sign-in?next=${encodeURIComponent(next)}`, locale });
    return null;
  }

  const t = await getTranslations("pay");
  const repo = await getRepo();
  const pendingCount = await repo.countPending(current.user.id);
  const status = planStatus(current.user);
  const initialPlan: PlanPeriod = isPlanPeriod(plan) ? plan : "yearly";
  const loc = (await getLocale()) as Locale;

  return (
    <div className="container-page py-12">
      <div className="max-w-2xl">
        <h1>{t("title")}</h1>
        <p className="mt-3 text-body-lg text-ink-2">{t("subtitle")}</p>

        {status.kind === "active" && status.until ? (
          <p className="mt-5 rounded-2xl bg-accent-soft px-4 py-3 text-small text-accent-ink">
            {t("alreadyPremium", { date: formatDate(status.until, loc) })}
          </p>
        ) : null}
        {pendingCount > 0 ? (
          <p className="mt-3 rounded-2xl bg-warn-soft px-4 py-3 text-small text-warn" data-testid="pending-notice">
            {t("pendingNotice", { count: pendingCount })}
          </p>
        ) : null}

        <div className="mt-8">
          <PaymentFlow
            initialPlan={initialPlan}
            prices={bdtPrices()}
            bkash={bkashConfig()}
            reference={userReference(current.user.id)}
          />
        </div>
      </div>
    </div>
  );
}
