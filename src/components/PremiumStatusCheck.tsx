"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatBdt, formatDate } from "@/lib/format";
import { isValidEmail } from "@/lib/premium-claim";
import {
  STATUS_CODE_KEY,
  fetchPremiumStatus,
  isStatusCode,
  premiumView,
  type PremiumView,
  type StatusPayment,
} from "@/lib/premium-status";
import { Skeleton } from "./Skeleton";
import { Sparkle } from "./Sparkle";
import { Spinner } from "./Spinner";

type Outcome =
  | { kind: "view"; email: string; view: PremiumView }
  | { kind: "error"; text: string };

/** Periods that already have a translated name in the `plans` namespace. */
const NAMED_PERIODS = new Set(["monthly", "yearly"]);

export function PremiumStatusCheck({ supportEmail }: { supportEmail: string }) {
  const t = useTranslations("checkStatus");
  const tp = useTranslations("plans");
  const locale = useLocale() as Locale;
  const fieldId = useId();

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const planName = (p: string) =>
    NAMED_PERIODS.has(p) ? tp(p) : p.charAt(0).toUpperCase() + p.slice(1);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const trimmed = email.trim();
    if (!trimmed) return setFieldError(t("errEmailRequired"));
    if (!isValidEmail(trimmed)) return setFieldError(t("errEmailInvalid"));

    setFieldError(null);
    setOutcome(null);
    setLoading(true);
    try {
      const result = await fetchPremiumStatus(trimmed);
      if (result.code !== "OK") {
        const mapped = isStatusCode(result.code) ? t(STATUS_CODE_KEY[result.code]) : null;
        setOutcome({ kind: "error", text: mapped ?? t("errUnknown") });
        return;
      }
      setOutcome({ kind: "view", email: trimmed, view: premiumView(result) });
    } catch {
      setOutcome({ kind: "error", text: t("errNetwork") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <form className="space-y-5" onSubmit={onSubmit} noValidate aria-busy={loading}>
          <div>
            <label htmlFor={`${fieldId}-email`} className="block text-small font-semibold text-ink">
              {t("emailLabel")}
            </label>
            <input
              id={`${fieldId}-email`}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError(null);
              }}
              placeholder={t("emailPlaceholder")}
              className="field mt-2"
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? `${fieldId}-email-error` : `${fieldId}-email-hint`}
              data-testid="status-email"
            />
            {fieldError ? (
              <p
                id={`${fieldId}-email-error`}
                role="alert"
                className="mt-2 text-small text-danger"
                data-testid="status-field-error"
              >
                {fieldError}
              </p>
            ) : (
              <p id={`${fieldId}-email-hint`} className="mt-2 text-small text-ink-2">
                {t("emailHint")}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full sm:w-auto"
            disabled={loading}
            data-testid="status-submit"
          >
            {loading ? <Spinner /> : null}
            {loading ? t("checking") : t("check")}
          </button>
        </form>
      </section>

      <div aria-live="polite">
        {loading ? <ResultLoading label={t("checking")} /> : null}

        {!loading && outcome?.kind === "error" ? (
          <p
            role="alert"
            className="rounded-2xl bg-danger-soft px-4 py-3 text-small text-danger"
            data-testid="status-error"
          >
            {outcome.text}
          </p>
        ) : null}

        {!loading && outcome?.kind === "view" ? (
          <Result
            view={outcome.view}
            email={outcome.email}
            locale={locale}
            planName={planName}
            supportEmail={supportEmail}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Stands in for the answer card while the lookup runs, so the page shows the
 * shape of what is coming rather than nothing at all.
 */
function ResultLoading({ label }: { label: string }) {
  return (
    <section className="card p-6" role="status" aria-busy="true" data-testid="status-loading">
      <Skeleton rounded="pill" className="h-[26px] w-28" />
      <Skeleton className="mt-4 h-8 w-3/5" />
      <Skeleton className="mt-3 h-5 w-2/5" />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-[62px]" />
        <Skeleton className="h-[62px]" />
      </div>
      <p className="mt-5 flex items-center gap-2 text-small text-ink-3">
        <Spinner size={15} />
        {label}
      </p>
    </section>
  );
}

function Result({
  view,
  email,
  locale,
  planName,
  supportEmail,
}: {
  view: PremiumView;
  email: string;
  locale: Locale;
  planName: (p: string) => string;
  supportEmail: string;
}) {
  const t = useTranslations("checkStatus");

  if (view.kind === "premium") {
    return (
      <section className="card p-6" data-testid="status-result" data-status="premium">
        <Badge tone="accent" icon>
          {t("premiumTitle")}
        </Badge>
        <h2 className="mt-4 text-[24px]">
          {view.daysLeft === null
            ? t("noExpiry")
            : t("daysLeft", { count: view.daysLeft })}
        </h2>
        <p className="mt-2 text-ink-2">{t("checkedFor", { email })}</p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {view.period ? <Tile label={t("planLabel")} value={planName(view.period)} /> : null}
          {view.until ? (
            <Tile label={t("untilLabel")} value={formatDate(view.until, locale)} />
          ) : null}
          {view.since ? (
            <Tile label={t("sinceLabel")} value={formatDate(view.since, locale)} />
          ) : null}
          {view.source ? <Tile label={t("sourceLabel")} value={sourceName(view.source)} /> : null}
        </dl>

        <LastPayment payment={view.lastPayment} locale={locale} />

        {view.pendingExtra ? (
          <p className="mt-5 rounded-2xl bg-warn-soft px-4 py-3 text-small text-warn" data-testid="status-pending-extra">
            {t("pendingExtra")}
          </p>
        ) : null}
      </section>
    );
  }

  if (view.kind === "pending") {
    return (
      <section className="card p-6" data-testid="status-result" data-status="pending">
        <Badge tone="warn">{t("pendingTitle")}</Badge>
        <h2 className="mt-4 text-[24px]">{t("pendingHeading")}</h2>
        <p className="mt-3 text-ink-2">{t("pendingBody")}</p>
        <p className="mt-2 text-ink-2">{t("checkedFor", { email })}</p>

        <LastPayment payment={view.lastPayment} locale={locale} />

        <p className="mt-5 rounded-2xl bg-bg-alt/70 px-4 py-3 text-small text-ink-2">
          {t.rich("pendingContact", {
            email: supportEmail,
            a: (chunks) => (
              <a href={`mailto:${supportEmail}`} className="text-accent-ink underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </section>
    );
  }

  if (view.kind === "expired") {
    return (
      <section className="card p-6" data-testid="status-result" data-status="expired">
        <Badge tone="muted">{t("expiredTitle")}</Badge>
        <h2 className="mt-4 text-[24px]">{t("expiredHeading", { date: formatDate(view.until, locale) })}</h2>
        <p className="mt-3 text-ink-2">{t("expiredBody")}</p>
        <p className="mt-2 text-ink-2">{t("checkedFor", { email })}</p>

        <LastPayment payment={view.lastPayment} locale={locale} />

        <Link href="/get-premium" className="btn btn-primary mt-5">
          {t("renew")}
        </Link>
      </section>
    );
  }

  return (
    <section className="card p-6" data-testid="status-result" data-status="none">
      <Badge tone="muted">{t("noneTitle")}</Badge>
      <h2 className="mt-4 text-[24px]">{t("noneHeading")}</h2>
      <p className="mt-3 text-ink-2">{t("noneBody")}</p>
      <p className="mt-2 text-ink-2">{t("checkedFor", { email })}</p>
      <Link href="/get-premium" className="btn btn-primary mt-5">
        {t("getPremium")}
      </Link>
    </section>
  );
}

function LastPayment({ payment, locale }: { payment: StatusPayment | null; locale: Locale }) {
  const t = useTranslations("checkStatus");
  if (!payment || (!payment.trx_id && payment.amount === null && !payment.paid_at)) return null;

  return (
    <div className="mt-5 rounded-2xl bg-bg-alt/70 px-4 py-3">
      <p className="label-micro">{t("lastPaymentLabel")}</p>
      <p className="mt-1 text-small text-ink">
        {payment.amount !== null ? formatBdt(payment.amount) : null}
        {payment.trx_id ? (
          <>
            {payment.amount !== null ? " · " : null}
            <span className="font-mono tracking-[0.1em]">{payment.trx_id}</span>
          </>
        ) : null}
      </p>
      {payment.paid_at ? (
        <p className="mt-1 text-small text-ink-2">
          {t("paidAt", { date: formatDate(payment.paid_at, locale) })}
        </p>
      ) : null}
    </div>
  );
}

const TONES = {
  accent: "bg-accent-soft text-accent-ink",
  warn: "bg-warn-soft text-warn",
  muted: "bg-bg-alt text-ink-2",
} as const;

function Badge({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof TONES;
  icon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={`pill ${TONES[tone]} inline-flex items-center gap-1.5`}>
      {icon ? <Sparkle size={13} /> : null}
      {children}
    </span>
  );
}

/** `plan_source` is a short machine word ("bkash"); make it presentable. */
function sourceName(source: string): string {
  return source === "bkash" ? "bKash" : source.charAt(0).toUpperCase() + source.slice(1);
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-bg-alt/70 px-4 py-3">
      <dt className="label-micro">{label}</dt>
      <dd className="mt-1 text-[16px] text-ink">{value}</dd>
    </div>
  );
}
