"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatBdt, formatDate } from "@/lib/format";
import { normalizeTrxId } from "@/lib/trx";
import { supabaseAnon } from "@/lib/supabase/anon";
import {
  BKASH_NUMBER,
  CLAIM_CODE_KEY,
  byDuration,
  fetchActivePlans,
  isClaimCode,
  isValidEmail,
  parseDuration,
  type ClaimPlan,
  type ClaimResult,
} from "@/lib/premium-claim";
import { CopyButton } from "./CopyButton";
import { Skeleton } from "./Skeleton";
import { Sparkle } from "./Sparkle";
import { Spinner } from "./Spinner";

type PlansState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; plans: ClaimPlan[] };

type Submission =
  | { kind: "success"; period: string; until: string | null }
  | { kind: "error"; text: string };

type FieldErrors = { plan?: string; email?: string; trx?: string };

/** Periods that already have a translated name in the `plans` namespace. */
const NAMED_PERIODS = new Set(["monthly", "yearly"]);

export function ClaimPremiumForm({ initialPlan }: { initialPlan?: string }) {
  const t = useTranslations("getPremium");
  const tp = useTranslations("plans");
  const locale = useLocale() as Locale;
  const fieldId = useId();

  const [plansState, setPlansState] = useState<PlansState>({ status: "loading" });
  const [period, setPeriod] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [trxId, setTrxId] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);

  const loadPlans = useCallback(async () => {
    setPlansState({ status: "loading" });
    try {
      const plans = (await fetchActivePlans()).sort(byDuration);
      setPlansState({ status: "ready", plans });
      // Preselect whatever the visitor clicked on the pricing cards.
      setPeriod((current) => {
        if (current && plans.some((p) => p.period === current)) return current;
        return plans.some((p) => p.period === initialPlan) ? initialPlan! : null;
      });
    } catch {
      setPlansState({ status: "error" });
    }
  }, [initialPlan]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const plans = plansState.status === "ready" ? plansState.plans : [];
  const selected = plans.find((p) => p.period === period) ?? null;
  const disabled = plansState.status !== "ready" || plans.length === 0;

  const planName = (p: string) =>
    NAMED_PERIODS.has(p) ? tp(p) : p.charAt(0).toUpperCase() + p.slice(1);

  const durationLabel = (interval: string) => {
    const parsed = parseDuration(interval);
    if (!parsed) return interval;
    return t(`duration_${parsed.unit}`, { count: parsed.count });
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    const trx = normalizeTrxId(trxId);
    const next: FieldErrors = {};

    if (!selected) next.plan = t("errPlanRequired");
    if (!trimmedEmail) next.email = t("errEmailRequired");
    else if (!isValidEmail(trimmedEmail)) next.email = t("errEmailInvalid");
    if (!trx) next.trx = t("errTrxRequired");

    setErrors(next);
    setSubmission(null);
    if (Object.keys(next).length > 0 || !selected) return;

    setSubmitting(true);
    const { data, error } = await supabaseAnon().rpc("claim_premium", {
      p_email: trimmedEmail,
      p_trx_id: trx,
      p_amount: selected.amount,
    });
    setSubmitting(false);

    if (error) {
      setSubmission({ kind: "error", text: t("errNetwork") });
      return;
    }

    const result = (data ?? {}) as ClaimResult;
    if (result.code === "SUCCESS") {
      setSubmission({
        kind: "success",
        period: result.plan_period ?? selected.period,
        until: result.premium_until ?? null,
      });
      // Clear the form: the claim is spent and must not be sent twice.
      setEmail("");
      setTrxId("");
      return;
    }

    const mapped = isClaimCode(result.code) ? t(CLAIM_CODE_KEY[result.code]) : null;
    setSubmission({ kind: "error", text: mapped ?? result.message ?? t("errUnknown") });
  }

  const amountBdt = selected ? formatBdt(selected.amount) : t("amountPending");

  return (
    <div className="space-y-6">
      {/* Step 1 — choose a plan */}
      <section className="card p-6">
        <Step n={1} title={t("step1")} />

        {plansState.status === "loading" ? (
          <div className="mt-4" role="status" aria-busy="true" data-testid="claim-plans-loading">
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-[86px]" />
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-small text-ink-3">
              <Spinner size={15} />
              {t("plansLoading")}
            </p>
          </div>
        ) : null}

        {plansState.status === "error" ? (
          <div className="mt-4 rounded-2xl bg-danger-soft px-4 py-4" role="alert">
            <p className="text-small text-danger">{t("plansError")}</p>
            <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={() => void loadPlans()}>
              {t("plansRetry")}
            </button>
          </div>
        ) : null}

        {plansState.status === "ready" && plans.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-warn-soft px-4 py-3 text-small text-warn" role="status">
            {t("plansEmpty")}
          </p>
        ) : null}

        {plansState.status === "ready" && plans.length > 0 ? (
          <>
            <div
              className="mt-4 grid gap-3 sm:grid-cols-2"
              role="radiogroup"
              aria-label={t("planLabel")}
              aria-describedby={errors.plan ? `${fieldId}-plan-error` : undefined}
            >
              {plans.map((plan) => {
                const isSelected = plan.period === period;
                return (
                  <label
                    key={plan.period}
                    className={`flex cursor-pointer flex-col gap-2 rounded-2xl border px-4 py-4 transition-colors ${
                      isSelected ? "border-accent bg-accent-soft/50" : "border-line bg-surface"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="plan"
                          value={plan.period}
                          checked={isSelected}
                          onChange={() => {
                            setPeriod(plan.period);
                            setErrors((e) => ({ ...e, plan: undefined }));
                          }}
                          className="h-4 w-4 accent-[var(--accent)]"
                          data-testid={`claim-plan-${plan.period}`}
                        />
                        <span className="font-medium text-ink">{planName(plan.period)}</span>
                      </span>
                      <span className="font-heading text-[20px] text-ink">
                        {formatBdt(plan.amount)}
                      </span>
                    </span>
                    <span className="pl-7 text-small text-ink-2">
                      {durationLabel(plan.duration)}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.plan ? (
              <p id={`${fieldId}-plan-error`} role="alert" className="mt-3 text-small text-danger">
                {errors.plan}
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      {/* Step 2 — pay with bKash */}
      <section className="card p-6">
        <Step n={2} title={t("step2")} />
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-2 marker:text-ink-3">
          <li>{t.rich("instr1", { amount: amountBdt, number: BKASH_NUMBER, b })}</li>
          <li>{t.rich("instr2", { b })}</li>
          <li>{t.rich("instr3", { b })}</li>
        </ol>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoTile label={t("bkashNumber")} value={BKASH_NUMBER} copy />
          <InfoTile label={t("amountToSend")} value={amountBdt} />
        </dl>
      </section>

      {/* Step 3 — activate */}
      <section className="card p-6">
        <Step n={3} title={t("step3")} />

        {submission?.kind === "success" ? (
          <div className="mt-4" data-testid="claim-success" aria-live="polite">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
              <Sparkle size={18} />
            </span>
            <h3 className="mt-4">{t("successTitle")}</h3>
            <p className="mt-3 text-ink-2">
              {submission.until
                ? t.rich("successBody", {
                    plan: planName(submission.period),
                    date: formatDate(submission.until, locale),
                    b,
                  })
                : t.rich("successBodyNoDate", { plan: planName(submission.period), b })}
            </p>
            <p className="mt-3 rounded-2xl bg-accent-soft px-4 py-3 text-small text-accent-ink">
              {t("successRestart")}
            </p>
            <button
              type="button"
              className="btn btn-secondary mt-5"
              onClick={() => setSubmission(null)}
            >
              {t("successAgain")}
            </button>
          </div>
        ) : (
          <form className="mt-4 space-y-5" onSubmit={onSubmit} noValidate aria-busy={submitting}>
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
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder={t("emailPlaceholder")}
                className="field mt-2"
                disabled={disabled}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={errors.email ? `${fieldId}-email-error` : `${fieldId}-email-hint`}
                data-testid="claim-email"
              />
              {errors.email ? (
                <p id={`${fieldId}-email-error`} role="alert" className="mt-2 text-small text-danger">
                  {errors.email}
                </p>
              ) : (
                <p id={`${fieldId}-email-hint`} className="mt-2 text-small text-ink-2">
                  {t("emailHint")}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={`${fieldId}-trx`} className="block text-small font-semibold text-ink">
                {t("trxLabel")}
              </label>
              <input
                id={`${fieldId}-trx`}
                name="trxId"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={20}
                value={trxId}
                onChange={(e) => {
                  setTrxId(normalizeTrxId(e.target.value));
                  setErrors((prev) => ({ ...prev, trx: undefined }));
                }}
                placeholder={t("trxPlaceholder")}
                className="field mt-2 font-mono tracking-[0.15em]"
                disabled={disabled}
                aria-invalid={errors.trx ? true : undefined}
                aria-describedby={errors.trx ? `${fieldId}-trx-error` : `${fieldId}-trx-hint`}
                data-testid="claim-trx"
              />
              {errors.trx ? (
                <p id={`${fieldId}-trx-error`} role="alert" className="mt-2 text-small text-danger">
                  {errors.trx}
                </p>
              ) : (
                <p id={`${fieldId}-trx-hint`} className="mt-2 text-small text-ink-2">
                  {t("trxHint")}
                </p>
              )}
            </div>

            {submission?.kind === "error" ? (
              <p
                role="alert"
                className="rounded-2xl bg-danger-soft px-4 py-3 text-small text-danger"
                data-testid="claim-error"
              >
                {submission.text}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto"
              disabled={submitting || disabled}
              data-testid="claim-submit"
            >
              {submitting ? <Spinner /> : null}
              {submitting ? t("submitting") : t("submit")}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function b(chunks: React.ReactNode) {
  return <strong className="text-ink">{chunks}</strong>;
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-3 text-[20px]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-heading text-[13px] text-accent-ink">
        {n}
      </span>
      {title}
    </h2>
  );
}

function InfoTile({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="rounded-2xl bg-bg-alt/70 px-4 py-3">
      <dt className="label-micro">{label}</dt>
      <dd className="mt-1 flex items-center justify-between gap-2 font-mono text-[16px] text-ink">
        <span>{value}</span>
        {copy ? <CopyButton value={value} /> : null}
      </dd>
    </div>
  );
}
