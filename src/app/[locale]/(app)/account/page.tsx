import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepo } from "@/lib/data/repo";
import { planStatus } from "@/lib/plan-status";
import { formatBdt, formatDate, formatDateTime, userReference } from "@/lib/format";
import { signOut } from "@/lib/actions/auth";
import { SectionLabel } from "@/components/SectionLabel";
import { Sparkle } from "@/components/Sparkle";
import { StatusPill } from "@/components/StatusPill";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title") };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as Locale;

  const current = await getCurrentUser();
  if (!current) {
    redirect({ href: "/sign-in?next=%2Faccount", locale });
    return null;
  }
  const { session, user } = current;

  const t = await getTranslations("account");
  const tp = await getTranslations("plans");
  const repo = await getRepo();
  const payments = await repo.listPaymentsForUser(user.id);
  const status = planStatus(user);

  const planLine = (() => {
    switch (status.kind) {
      case "active": {
        const period = status.period ? tp(status.period) : null;
        const when = status.until ? t("renews", { date: formatDate(status.until, locale) }) : t("noExpiry");
        return period ? t("periodAndDate", { period, date: when }) : when;
      }
      case "ended":
        return t("ended", { date: formatDate(status.until, locale) });
      default:
        return null;
    }
  })();

  const cta =
    status.kind === "active" ? t("extend") : status.kind === "ended" ? t("renew") : t("getPremium");

  return (
    <div className="container-page py-12">
      <div className="max-w-2xl space-y-8">
        {/* Profile */}
        <section className="flex items-center gap-4">
          {session.avatarUrl ?? user.avatar_url ? (
            <Image
              src={(session.avatarUrl ?? user.avatar_url) as string}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft font-heading text-[22px] text-accent-ink">
              {(user.name || session.name || "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[26px]">{user.name || session.name}</h1>
            <p className="truncate text-small text-ink-2">{t("signedInAs", { email: user.email ?? session.email ?? "" })}</p>
          </div>
        </section>

        {/* Plan card */}
        <section className="card p-6" data-testid="plan-card" data-plan-status={status.kind}>
          <SectionLabel>{t("yourPlan")}</SectionLabel>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2" data-testid="plan-title">
                {status.kind === "active" ? <Sparkle size={18} className="text-accent" /> : null}
                {status.kind === "active" ? t("premium") : t("freePlan")}
              </h2>
              {planLine ? (
                <p className="mt-2 text-ink-2" data-testid="plan-line">
                  {planLine}
                </p>
              ) : null}
            </div>
            <Link href="/pay" className="btn btn-primary btn-sm">
              <Sparkle size={14} />
              {cta}
            </Link>
          </div>
          <p className="mt-5 text-small text-ink-2">
            {t("userIdLabel")}: <span className="font-mono text-ink-2">{userReference(user.id)}</span>
          </p>
        </section>

        {/* Payments */}
        <section aria-labelledby="payments-h">
          <SectionLabel>{t("paymentsLabel")}</SectionLabel>
          <h2 id="payments-h" className="mt-2 text-[22px]">
            {t("paymentsTitle")}
          </h2>
          {payments.length === 0 ? (
            <p className="mt-4 text-ink-2">{t("noPayments")}</p>
          ) : (
            <ul className="mt-4 space-y-3" data-testid="payments-list">
              {payments.map((p) => (
                <li key={p.id} className="card p-5" data-testid="payment-row" data-trx={p.trx_id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[16px] tracking-[0.1em] text-ink">{p.trx_id}</p>
                      <p className="mt-1 text-small text-ink-2">
                        {tp(p.plan_period)} · {formatBdt(p.amount_bdt)}
                      </p>
                    </div>
                    <StatusPill status={p.status} />
                  </div>
                  <p className="mt-3 text-small text-ink-2">
                    {t("submitted", { date: formatDateTime(p.created_at, locale) })}
                    {p.verified_at ? ` · ${t("reviewed", { date: formatDateTime(p.verified_at, locale) })}` : ""}
                  </p>
                  {p.note ? (
                    <p className="mt-3 rounded-2xl bg-bg-alt/70 px-4 py-3 text-small text-ink-2">
                      <span className="label-micro block">{t("adminNote")}</span>
                      <span className="mt-1 block">{p.note}</span>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <form action={signOut}>
          <button type="submit" className="btn btn-secondary btn-sm" data-testid="sign-out">
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
