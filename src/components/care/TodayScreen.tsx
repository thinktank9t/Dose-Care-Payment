"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  daysOfSupply,
  formatClock,
  greetingKey,
  isLow,
  isPast,
  scheduledDoses,
  todayKey,
  unitKey,
} from "@/lib/care/schedule";
import { DATE_LOCALE, formatNumber } from "@/lib/format";
import type { ScheduledDose } from "@/lib/care/types";
import { DoseFlag, EmptyState, Icon, MedGlyph, Sheet } from "./chrome";
import { useCare } from "./store";

const UNDO_MS = 5000;

export function TodayScreen() {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { profile, markDose, refill } = useCare();
  const now = new Date();
  const today = todayKey(now);
  const saved = useMemo(
    () => scheduledDoses(profile.medicines, profile.logs, today, now),
    [profile.medicines, profile.logs, today, now],
  );

  // A one-tap "taken" waits a few seconds before it is saved, so a stray tap
  // can be undone before caregivers see it. Leaving the page saves it at once.
  const [pending, setPending] = useState<ScheduledDose | null>(null);
  const pendingRef = useRef<ScheduledDose | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitPending = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const dose = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (dose) markDose({ medicineId: dose.medicine.id, date: dose.date, time: dose.time, status: "taken" });
  }, [markDose]);
  const commitRef = useRef(commitPending);
  commitRef.current = commitPending;
  useEffect(() => {
    // Reload or tab close skips React cleanup, so save on pagehide too.
    // flushSync makes the store write to localStorage before the page goes.
    const onHide = () => flushSync(() => commitRef.current());
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      commitRef.current();
    };
  }, []);

  function markTakenWithUndo(dose: ScheduledDose) {
    commitPending();
    pendingRef.current = dose;
    setPending(dose);
    timerRef.current = setTimeout(() => commitRef.current(), UNDO_MS);
  }
  function undoPending() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = null;
    setPending(null);
  }

  const doses = pending
    ? saved.map((dose) =>
        dose.medicine.id === pending.medicine.id && dose.time === pending.time ? { ...dose, status: "taken" as const } : dose,
      )
    : saved;
  const [sheet, setSheet] = useState<ScheduledDose | null>(null);
  const [refillId, setRefillId] = useState<string | null>(null);
  const [add, setAdd] = useState(10);

  const taken = doses.filter((dose) => dose.status === "taken").length;
  const left = doses.length - taken;
  const upcoming = doses.filter((dose) => dose.status !== "taken" && dose.status !== "skipped" && !isPast(today, dose.time, now));
  const earlier = doses.filter((dose) => isPast(today, dose.time, now) || dose.status === "taken" || dose.status === "skipped");
  const overdue = doses.filter((dose) => dose.status !== "taken" && dose.status !== "skipped" && dose.status !== "snoozed" && isPast(today, dose.time, now));
  const next = upcoming[0];
  const low = profile.medicines.filter(isLow);
  const percent = doses.length === 0 ? 0 : Math.round((taken / doses.length) * 100);
  const dateLabel = new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(locale === "bn" ? { numberingSystem: "beng" as const } : null),
  }).format(now);
  const initial = (profile.name.trim()[0] || "D").toUpperCase();
  const refillMed = profile.medicines.find((med) => med.id === refillId) ?? null;

  function openDose(dose: ScheduledDose) {
    if (profile.fullScreenReminders && dose.status !== "taken" && dose.status !== "skipped" && isPast(today, dose.time, now)) {
      router.push(`/reminder?med=${dose.medicine.id}&time=${dose.time}`);
      return;
    }
    if (dose.status === "taken" || dose.status === "skipped" || isPast(today, dose.time, now)) {
      setSheet(dose);
      return;
    }
    markTakenWithUndo(dose);
  }

  return (
    <div className="container-page py-8 lg:py-10">
      <p className="text-small text-ink-2">{dateLabel}</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <h1 className="min-w-0">
          {t(`today.${greetingKey(now)}`)}, {profile.name.trim() || t("today.friend")}.
        </h1>
        <Link href="/profile" className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft font-heading text-[20px] text-accent-ink" aria-label={t("tabs.profile")}>
          {initial}
        </Link>
      </div>

      {doses.length === 0 ? (
        <EmptyState
          icon={<Icon name="bell" size={42} />}
          title={t("today.emptyTitle")}
          body={t("today.emptyBody")}
          action={<Link href="/medicines/new" className="font-medium text-accent-ink">{t("today.add")}</Link>}
        />
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <div>
          <section className="card p-5">
            <div className="flex items-center gap-3">
              <Progress value={percent} />
              <div className="min-w-0">
                <p className="text-[16px] font-medium text-ink">
                  {next ? t("today.next", { name: next.medicine.name, time: formatClock(next.time, locale) }) : t("today.allDone")}
                </p>
                <p className="text-small text-ink-2">{t("today.progress", { taken: formatNumber(taken, locale), left: formatNumber(left, locale) })}</p>
              </div>
            </div>
            <Link href="/history" className="mt-3 flex min-h-11 items-center justify-between border-t border-line pt-3 font-medium text-accent-ink">
              {t("today.history")}
              <Icon name="chevron" size={18} />
            </Link>
          </section>

          <div className="mt-3 space-y-2">
            {overdue.map((dose) => (
              <button key={`${dose.medicine.id}-${dose.time}-due`} type="button" onClick={() => openDose(dose)} className="flex w-full items-center gap-3 rounded-[18px] bg-warn-soft px-3 py-3 text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-warn"><Icon name="bell" size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-warn">{t("today.overdue", { name: dose.medicine.name, time: formatClock(dose.time, locale) })}</span>
                  <span className="block text-small text-ink-2">{t("today.overdueHint")}</span>
                </span>
                <Icon name="chevron" size={18} />
              </button>
            ))}
            {low.map((med) => (
              <button key={med.id} type="button" onClick={() => { setRefillId(med.id); setAdd(Math.max(1, med.packSize || 10)); }} className="flex w-full items-center gap-3 rounded-[18px] bg-danger-soft px-3 py-3 text-left">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-danger"><Icon name="battery" size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-danger">{t("today.low", { name: med.name })}</span>
                  <span className="block text-small text-ink-2">{t("today.lowHint")}</span>
                </span>
                <Icon name="chevron" size={18} />
              </button>
            ))}
          </div>

          </div>
          <div className="grid items-start gap-6 xl:grid-cols-2">
          {upcoming.length > 0 && (
            <section>
              <h2 className="label-micro">{t("today.upNext", { count: formatNumber(upcoming.length, locale) })}</h2>
              <ul className="mt-2 space-y-2">
                {upcoming.map((dose) => (
                  <DoseRow key={`${dose.medicine.id}-${dose.time}`} dose={dose} locale={locale} onOpen={() => openDose(dose)} />
                ))}
              </ul>
            </section>
          )}
          {earlier.length > 0 && (
            <section>
              <h2 className="label-micro">{t("today.earlier", { count: formatNumber(earlier.length, locale) })}</h2>
              <ul className="mt-2 space-y-2">
                {earlier.map((dose) => (
                  <DoseRow key={`${dose.medicine.id}-${dose.time}-e`} dose={dose} locale={locale} onOpen={() => openDose(dose)} />
                ))}
              </ul>
            </section>
          )}
          </div>
        </div>
      )}

      {pending ? (
        <div
          role="status"
          data-testid="dose-undo"
          className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto md:bottom-4 flex w-[calc(100%-2*var(--gutter))] max-w-md items-center gap-3 rounded-[18px] bg-ink px-4 py-3 text-bg"
        >
          <Icon name="check" size={18} />
          <span className="min-w-0 flex-1 font-medium">{t("today.markedTaken", { name: pending.medicine.name })}</span>
          <button type="button" onClick={undoPending} className="btn btn-sm shrink-0 border border-current text-bg">
            {t("today.undo")}
          </button>
        </div>
      ) : null}

      {sheet ? (
        <Sheet title={sheet.medicine.name} onClose={() => setSheet(null)}>
          <p className="mb-4 text-ink-2">{formatClock(sheet.time, locale)}</p>
          <button type="button" className="btn btn-primary w-full" onClick={() => { markDose({ medicineId: sheet.medicine.id, date: sheet.date, time: sheet.time, status: "taken" }); setSheet(null); }}>
            <Icon name="check" size={18} /> {t("today.took")}
          </button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => { markDose({ medicineId: sheet.medicine.id, date: sheet.date, time: sheet.time, status: "snoozed", snoozeMinutes: 10 }); setSheet(null); }}>
              {t("today.snooze")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { markDose({ medicineId: sheet.medicine.id, date: sheet.date, time: sheet.time, status: "skipped" }); setSheet(null); }}>
              {t("today.skip")}
            </button>
          </div>
        </Sheet>
      ) : null}

      {refillMed ? (
        <Sheet title={refillMed.name} onClose={() => setRefillId(null)}>
          <p className="text-ink-2">{t("today.refillHave", { count: formatNumber(refillMed.stock, locale), unit: t(`unit.${unitKey(refillMed.form)}`) })}</p>
          {daysOfSupply(refillMed) !== null ? <p className="mt-1 text-small text-warn">{t("meds.daysLeft", { count: formatNumber(daysOfSupply(refillMed) ?? 0, locale) })}</p> : null}
          <label className="mt-4 block text-small text-ink-2" htmlFor="refill-add">{t("today.refillAdd")}</label>
          <input id="refill-add" className="field mt-2 w-full" inputMode="numeric" value={add} onChange={(event) => setAdd(Number(event.target.value) || 0)} />
          <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => { refill(refillMed.id, Math.max(0, add)); setRefillId(null); }}>
            {t("today.save")}
          </button>
        </Sheet>
      ) : null}
    </div>
  );
}

function Progress({ value }: { value: number }) {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--line)" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - value / 100)}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" fontSize="13" fill="var(--ink)" fontFamily="var(--font-body), sans-serif">
        {value}%
      </text>
    </svg>
  );
}

function DoseRow({
  dose,
  locale,
  onOpen,
}: {
  dose: ScheduledDose;
  locale: string;
  onOpen: () => void;
}) {
  const t = useTranslations("care");
  const done = dose.status === "taken";
  const detail = dose.medicine.condition || (dose.medicine.food === "either" ? "" : t(`food.${dose.medicine.food}`));
  return (
    <li>
      <button type="button" onClick={onOpen} className="card flex w-full items-center gap-3 p-3 text-left">
        <MedGlyph form={dose.medicine.form} color={dose.medicine.color} />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-ink">{dose.medicine.name}</span>
          {detail ? <span className="block text-small text-ink-2">{detail}</span> : null}
          <DoseFlag dose={dose} className="mt-1" />
        </span>
        <span className="text-small text-ink-2">{formatClock(dose.time, locale)}</span>
        <span className={`ml-1 flex h-6 w-6 items-center justify-center rounded-full border ${done ? "border-accent bg-accent text-on-accent" : "border-line"}`}>
          {done ? <Icon name="check" size={14} /> : null}
        </span>
      </button>
    </li>
  );
}
