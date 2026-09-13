"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { submitPayment, type SubmitState } from "@/lib/actions/payments";
import type { BkashAccountType, BkashMethod } from "@/lib/env";
import { PLAN_PERIODS, type PlanPeriod } from "@/lib/plans";
import { formatBdt } from "@/lib/format";
import { normalizeTrxId } from "@/lib/trx";
import { CopyButton } from "./CopyButton";
import { Sparkle } from "./Sparkle";

type Props = {
  initialPlan: PlanPeriod;
  prices: Record<PlanPeriod, number>;
  bkash: { number: string; accountType: BkashAccountType; method: BkashMethod };
  reference: string;
};

const ERROR_KEY = {
  trx_invalid: "errTrxInvalid",
  sender_invalid: "errSenderInvalid",
  plan_invalid: "errPlanInvalid",
  duplicate_trx: "errDuplicate",
  too_many_pending: "errTooMany",
  price_unset: "errPriceUnset",
  unauthenticated: "errUnauthenticated",
  unknown: "errUnknown",
} as const;

export function PaymentFlow({ initialPlan, prices, bkash, reference }: Props) {
  const t = useTranslations("pay");
  const tp = useTranslations("plans");
  const [plan, setPlan] = useState<PlanPeriod>(initialPlan);
  const [trx, setTrx] = useState("");
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitPayment, {
    status: "idle",
  });

  const amount = prices[plan];
  const amountLabel = amount > 0 ? formatBdt(amount) : tp("bdtUnset");
  const methodLabel = bkash.method === "payment" ? t("methodPayment") : t("methodSendMoney");
  const accountLabel = bkash.accountType === "merchant" ? t("accountMerchant") : t("accountPersonal");

  if (state.status === "success") {
    return (
      <section className="card p-7" data-testid="submit-success" aria-live="polite">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Sparkle size={18} />
        </span>
        <h2 className="mt-4">{t("successTitle")}</h2>
        <p className="mt-3 text-ink-2">
          {t.rich("successBody", {
            trxId: state.trxId,
            b: (chunks) => <strong className="font-mono text-ink">{chunks}</strong>,
          })}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/account" className="btn btn-primary">
            {t("successAccount")}
          </Link>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setTrx("");
              window.location.reload();
            }}
          >
            {t("successAgain")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: plan */}
      <section className="card p-6">
        <Step n={1} title={t("step1")} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("planLabel")}>
          {PLAN_PERIODS.map((p) => {
            const selected = p === plan;
            return (
              <label
                key={p}
                className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-4 transition-colors ${
                  selected ? "border-accent bg-accent-soft/50" : "border-line bg-surface"
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="planPicker"
                    value={p}
                    checked={selected}
                    onChange={() => setPlan(p)}
                    className="h-4 w-4 accent-[var(--accent)]"
                    data-testid={`plan-${p}`}
                  />
                  <span className="font-medium text-ink">{tp(p)}</span>
                </span>
                <span className="font-heading text-[20px] text-ink">
                  {prices[p] > 0 ? formatBdt(prices[p]) : "—"}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Step 2: bKash instructions */}
      <section className="card p-6">
        <Step n={2} title={t("step2")} />
        <p className="mt-3 text-ink-2">{t("instructionsIntro")}</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink-2 marker:text-ink-3">
          <li>{t.rich("instr1", { method: methodLabel, b })}</li>
          <li>{t.rich("instr2", { number: bkash.number, accountType: accountLabel, b })}</li>
          <li>{t.rich("instr3", { amount: amountLabel, b })}</li>
          <li>{t.rich("instr4", { reference, b })}</li>
          <li>{t.rich("instr5", { b })}</li>
        </ol>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoTile label={t("bkashNumber")} value={bkash.number} copy />
          <InfoTile label={t("amount")} value={amountLabel} />
          <InfoTile label={t("yourReference")} value={reference} copy />
        </dl>
      </section>

      {/* Step 3: form */}
      <section className="card p-6">
        <Step n={3} title={t("step3")} />
        <form action={action} className="mt-4 space-y-5" noValidate>
          <input type="hidden" name="planPeriod" value={plan} />

          <div>
            <label htmlFor="trxId" className="block text-small font-semibold text-ink">
              {t("trxIdLabel")}
            </label>
            <input
              id="trxId"
              name="trxId"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              inputMode="text"
              maxLength={12}
              value={trx}
              onChange={(e) => setTrx(normalizeTrxId(e.target.value))}
              placeholder={t("trxIdPlaceholder")}
              className="field mt-2 font-mono tracking-[0.15em]"
              aria-describedby="trx-hint"
              data-testid="trx-input"
            />
            <p id="trx-hint" className="mt-2 text-small text-ink-2">
              {t("trxIdHint")}
            </p>
          </div>

          <div>
            <label htmlFor="senderNumber" className="block text-small font-semibold text-ink">
              {t("senderLabel")}
            </label>
            <input
              id="senderNumber"
              name="senderNumber"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("senderPlaceholder")}
              className="field mt-2"
              aria-describedby="sender-hint"
              data-testid="sender-input"
            />
            <p id="sender-hint" className="mt-2 text-small text-ink-2">
              {t("senderHint")}
            </p>
          </div>

          {state.status === "error" ? (
            <p role="alert" className="rounded-2xl bg-danger-soft px-4 py-3 text-small text-danger" data-testid="submit-error">
              {t(ERROR_KEY[state.error])}
            </p>
          ) : null}

          <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending} data-testid="submit-trx">
            {pending ? t("submitting") : t("submit")}
          </button>
        </form>
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
