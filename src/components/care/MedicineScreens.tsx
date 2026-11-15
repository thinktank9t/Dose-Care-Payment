"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  MED_COLORS,
  blankMedicine,
  daysOfSupply,
  formatClock,
  isLow,
  occursOn,
  scheduledDoses,
  todayKey,
  unitKey,
  weekMarks,
} from "@/lib/care/schedule";
import { formatNumber, localizeDigits } from "@/lib/format";
import type { AlertSound, DoseLog, Food, MedColor, MedForm, Medicine, Repeat } from "@/lib/care/types";
import { BackButton, EmptyState, Icon, starterTips, MedGlyph, STICKY_ACTION, ScreenHeader, Segmented, Sheet, Toggle } from "./chrome";
import { useCare } from "./store";

const FORMS: MedForm[] = ["tablet", "capsule", "liquid", "injection"];
const COLORS: MedColor[] = ["sand", "sky", "blush", "stone", "mint"];
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export function MedicinesScreen() {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const { profile } = useCare();
  const [lowOnly, setLowOnly] = useState(false);
  const today = todayKey();
  const dueToday = (med: Medicine) => !med.paused && occursOn(med, today);
  // Today's medicines first (stable within each group).
  const meds = (lowOnly ? profile.medicines.filter(isLow) : profile.medicines)
    .map((med, index) => ({ med, index }))
    .sort((a, b) => Number(dueToday(b.med)) - Number(dueToday(a.med)) || a.index - b.index)
    .map((item) => item.med);

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="relative flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <MedsArt />
        <div>
          <h1>{t("meds.title")}</h1>
          <p className="mt-2 text-ink-2">{localizeDigits(t("meds.count", { count: profile.medicines.length }), locale)}</p>
        </div>
        {/* A filter with a visible word, not a bare icon. Nothing to filter
            until there is a medicine. */}
        {profile.medicines.length > 0 ? (
          <button
            type="button"
            aria-pressed={lowOnly}
            onClick={() => setLowOnly((value) => !value)}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-[14px] font-medium transition-colors ${
              lowOnly ? "border-danger bg-danger-soft text-danger" : "border-line bg-surface text-ink-2 hover:text-ink"
            }`}
            data-testid="filter-low"
          >
            <Icon name="battery" size={18} />
            {t("meds.lowOnly")}
          </button>
        ) : null}
      </div>
      {profile.medicines.length === 0 ? (
        <EmptyState
          icon={<Icon name="pill" size={40} />}
          title={t("meds.emptyTitle")}
          body={t("meds.emptyBody")}
          action={<Link href="/medicines/new" className="btn btn-primary" data-testid="empty-add"><Icon name="plus" size={20} strokeWidth={2} />{t("today.add")}</Link>}
          tips={starterTips(t)}
        />
      ) : meds.length === 0 ? (
        <p className="card mt-8 p-6 text-center text-ink-2">{t("meds.noneLow")}</p>
      ) : (
        <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 xl:grid-cols-3">
          {meds.map((med) => (
            <li key={med.id}>
              <MedicineCard med={med} logs={profile.logs} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One medicine in the list: what it is and how much (top), when it is taken
 * and how much is left (bottom). Only an exception gets a pill (low stock or
 * paused); "active" is the normal state and needs no label.
 */
function MedicineCard({ med, logs }: { med: Medicine; logs: DoseLog[] }) {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const low = isLow(med);
  // Due today: an accent edge, a "Today" badge, and how many of today's doses are taken.
  const todays = med.paused ? [] : scheduledDoses([med], logs, todayKey());
  const isToday = todays.length > 0;
  const takenToday = todays.filter((dose) => dose.status === "taken").length;
  const allDone = isToday && takenToday === todays.length;
  const unit = t(`unit.${unitKey(med.form)}`);
  const note = conditionNote(med.condition);
  return (
    <Link
      href={`/medicines/${med.id}`}
      className={`card relative flex h-full flex-col gap-4 overflow-hidden p-4 transition-colors hover:border-ink-2 ${med.paused ? "opacity-75" : ""} ${isToday ? "!border-accent/60" : ""}`}
      data-today={isToday || undefined}
    >
      {isToday ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-accent" /> : null}
      <span className="flex items-start gap-3">
        <MedGlyph form={med.form} color={med.color} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-medium text-ink">{med.name}</span>
          <span className="mt-0.5 block text-small text-ink-2">{t("meds.doseLine", { count: med.amount, unit })}</span>
          {note ? <span className="mt-0.5 block truncate text-small text-ink-2">{t("meds.forCondition", { condition: note })}</span> : null}
        </span>
        {med.paused ? <span className="pill shrink-0 bg-bg-alt text-ink-2">{t("meds.paused")}</span> : null}
        {isToday ? (
          <span className={`pill inline-flex shrink-0 items-center gap-1 ${allDone ? "bg-accent text-on-accent" : "bg-accent-soft text-accent-ink"}`}>
            {allDone ? <Icon name="check" size={12} strokeWidth={2.4} /> : <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
            {t("meds.dueToday")}
          </span>
        ) : null}
        <span aria-hidden className="mt-1 shrink-0 text-ink-2"><Icon name="chevron" size={18} /></span>
      </span>
      <span className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3 text-small text-ink-2">
        {isToday ? (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${allDone ? "bg-accent text-on-accent" : "bg-accent-soft text-accent-ink"}`}>
            <Icon name={allDone ? "check" : "calendar"} size={14} strokeWidth={allDone ? 2.4 : 1.6} />
            {allDone ? t("meds.todayDone") : t("meds.todayProgress", { taken: takenToday, total: todays.length })}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-alt px-2.5 py-1">
          <Icon name="clock" size={14} />
          {med.times.map((time) => formatClock(time, locale)).join(", ")}
        </span>
        <span className="rounded-full bg-bg-alt px-2.5 py-1">{scheduleLabel(med, t, locale)}</span>
        {med.trackSupply ? (
          <span className={`rounded-full px-2.5 py-1 ${low ? "bg-danger-soft text-danger" : "bg-bg-alt"}`}>
            {low ? t("meds.lowLeft", { count: med.stock }) : t("meds.left", { count: med.stock })}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** Answers that only mean "nothing to say" (typed into the optional
 *  condition field, often in the phone app) are not worth showing. */
const EMPTY_ANSWERS = new Set(["no", "none", "n/a", "na", "nil", "-", "--", ".", "না", "নেই", "কিছু না"]);

function conditionNote(value: string): string | null {
  const text = value.trim();
  return text && !EMPTY_ANSWERS.has(text.toLowerCase()) ? text : null;
}

/**
 * Faint line art behind the page title (wider screens only): a pill, a
 * capsule, a clock and a sparkle in the app's icon style, drifting slowly.
 * Uses the shared .backdrop-art motion, so reduced motion stops it and high
 * contrast hides it.
 */
function MedsArt() {
  return (
    <svg
      aria-hidden
      className="backdrop-art meds-art pointer-events-none absolute -top-6 right-48 -z-10 hidden h-[150px] w-[360px] text-accent md:block"
      viewBox="0 0 360 150"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <g transform="rotate(-28 70 80)">
        <rect x="24" y="60" width="92" height="38" rx="19" />
        <path d="M70 60v38" />
      </g>
      <circle cx="176" cy="54" r="26" />
      <path d="M158 72l36-36" />
      <circle cx="268" cy="86" r="40" />
      <circle cx="268" cy="86" r="52" strokeDasharray="3 9" />
      <path d="M268 62v24l16 10" />
      <path d="M150 116l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
      <path d="M338 22l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" />
    </svg>
  );
}

/** Common dose times offered as one-tap chips. */
const QUICK_TIMES = ["08:00", "14:00", "20:00", "22:00"];

function sameTimes(a: string[], b: string[]) {
  return a.length === b.length && [...a].sort().every((time, i) => time === [...b].sort()[i]);
}

/** A time not already in the list for "Add another time" (duplicates would be one dose). */
function nextFreeTime(times: string[]) {
  for (const time of ["20:00", ...QUICK_TIMES, "12:00", "18:00", "06:00"]) if (!times.includes(time)) return time;
  for (let hour = 0; hour < 24; hour++) {
    const time = `${String(hour).padStart(2, "0")}:00`;
    if (!times.includes(time)) return time;
  }
  return "20:00";
}

function formIcon(form: MedForm) {
  return form === "capsule" ? "capsule" : form === "liquid" ? "drop" : form === "injection" ? "syringe" : "pill";
}

function scheduleLabel(med: Medicine, t: ReturnType<typeof useTranslations<"care">>, locale: Locale) {
  if (med.repeat === "weekly") return t("meds.weekly");
  if (med.repeat === "custom") return t("meds.everyN", { count: formatNumber(med.intervalDays, locale) });
  return t("meds.everyDay");
}

export function MedicineDetail({ id, personId }: { id: string; personId?: string }) {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { ready, profile, setPaused, deleteMedicine, refill, setSupply, markDose } = useCare();
  const person = personId ? profile.people.find((item) => item.id === personId) : undefined;
  const med = (person ? person.medicines : profile.medicines).find((item) => item.id === id);
  const logs = personId ? profile.personLogs[personId] ?? [] : profile.logs;
  const [timesOpen, setTimesOpen] = useState(false);
  const [refillOpen, setRefillOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [add, setAdd] = useState(10);
  const marks = useMemo(() => (med ? weekMarks(med, logs) : []), [med, logs]);
  if (!ready) return <div className="min-h-svh" />;
  if (!med) {
    return <p className="px-5 py-10 text-ink-2">{t("meds.missing")}</p>;
  }
  const canEdit = !person || person.permissions.editMedicines;
  const canMark = !person || person.permissions.markDoses;
  const today = todayKey();
  const todayDoses = scheduledDoses([med], logs, today);
  const note = conditionNote(med.condition);
  // One plain sentence instead of a bare note: how much, how often, with food or not.
  const summary = [
    t("meds.doseLine", { count: med.amount, unit: t(`unit.${unitKey(med.form)}`) }),
    scheduleLabel(med, t, locale),
    med.food === "either" ? t("meds.anyFood") : t(`food.${med.food}`),
  ].join(" · ");
  const base = personId ? `/care/${personId}` : "/medicines";
  const supplyDays = daysOfSupply(med);
  const taken = marks.filter((mark) => mark.state === "done").length;
  const due = marks.filter((mark) => mark.state !== "off" && mark.state !== "future").length;
  const percent = due === 0 ? 0 : Math.round((taken / due) * 100);

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="flex items-center justify-between">
        <BackButton onClick={() => router.push(personId ? `/care/${personId}` : "/medicines")} label={t("common.back")} />
        {canEdit ? (
          <Link
            href={`${base}/edit/${med.id}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[14px] font-medium text-ink transition-colors hover:border-accent hover:text-accent-ink"
            data-testid="med-edit"
          >
            <Icon name="edit" size={18} />
            {t("meds.editMedicine")}
          </Link>
        ) : <span />}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <MedGlyph form={med.form} color={med.color} size={56} />
        <div>
          <div className="flex flex-wrap gap-1.5">
            <span className="pill bg-accent-soft text-accent-ink">{med.paused ? t("meds.paused") : t("meds.active")}</span>
            {isLow(med) ? <span className="pill bg-warn-soft text-warn">{t("meds.low")}</span> : null}
          </div>
          <h1 className="mt-2 text-[30px]">{med.name}</h1>
          <p className="text-ink-2">{summary}</p>
          {note ? <p className="text-small text-ink-2">{t("meds.forCondition", { condition: note })}</p> : null}
          {person ? <p className="text-small text-ink-2">{t("meds.forPerson", { name: person.name })}</p> : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2">
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <p className="label-micro">{t("meds.thisWeek")}</p>
          <p className="font-medium text-accent-ink">{t("meds.onTime", { count: formatNumber(percent, locale) })}</p>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {marks.map((mark) => (
            <div key={mark.key}>
              {/* A taken day is filled with the medicine's own glyph. */}
              <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[11px] ${
                mark.state === "done" ? "bg-accent text-on-accent" :
                mark.state === "missed" ? "bg-warn-soft text-warn" :
                mark.state === "some" ? "bg-pending-soft text-pending" :
                mark.state === "today" ? "border-2 border-dashed border-accent text-accent-ink" :
                "bg-bg-alt text-ink-3"
              }`}>
                {mark.state === "done" || mark.state === "some" ? <Icon name={formIcon(med.form)} size={18} strokeWidth={2} /> : mark.state === "missed" ? <Icon name="close" size={14} strokeWidth={2} /> : ""}
              </span>
              <span className="mt-1 block text-[11px] text-ink-3">
                {new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(`${mark.key}T12:00:00`))}
              </span>
            </div>
          ))}
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
          <li className="flex items-center gap-1.5"><span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent"><Icon name={formIcon(med.form)} size={10} strokeWidth={2.4} /></span>{t("meds.keyTaken")}</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-4 w-4 rounded-full bg-warn-soft" />{t("meds.keyMissed")}</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-4 w-4 rounded-full border-2 border-dashed border-accent" />{t("meds.keyToday")}</li>
        </ul>
      </section>

      <div>
      {/* Where a dose gets recorded: each of today's times, with Taken / Skip. */}
      <section className="card p-5" data-testid="med-today">
        <p className="label-micro">{t("meds.todayDoses")}</p>
        {todayDoses.length === 0 || med.paused ? (
          <p className="mt-3 text-ink-2">{t("meds.notToday")}</p>
        ) : (
          <>
            <ul className="mt-3 divide-y divide-line">
              {todayDoses.map((dose) => {
                const done = dose.status === "taken";
                const skipped = dose.status === "skipped";
                return (
                  <li key={dose.time} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${done ? "bg-accent text-on-accent" : "bg-bg-alt text-ink-2"}`}>
                        <Icon name={done ? formIcon(med.form) : "clock"} size={18} strokeWidth={done ? 2 : 1.6} />
                      </span>
                      <span>
                        <span className="block text-[17px] font-medium">{formatClock(dose.time, locale)}</span>
                        <span className={`block text-small ${done ? "text-accent-ink" : skipped ? "text-warn" : "text-ink-2"}`}>
                          {done ? t("meds.statusTaken") : skipped ? t("meds.statusSkipped") : t("meds.statusDue")}
                        </span>
                      </span>
                    </span>
                    {canMark ? (
                      <span className="flex gap-2">
                        <button
                          type="button"
                          aria-pressed={skipped}
                          className={`btn btn-sm ${skipped ? "bg-warn-soft text-warn" : "btn-secondary"}`}
                          onClick={() => markDose({ medicineId: med.id, date: today, time: dose.time, status: "skipped", personId })}
                        >
                          {t("meds.markSkip")}
                        </button>
                        <button
                          type="button"
                          aria-pressed={done}
                          className={`btn btn-sm ${done ? "bg-accent-soft text-accent-ink" : "btn-primary"}`}
                          onClick={() => markDose({ medicineId: med.id, date: today, time: dose.time, status: "taken", personId })}
                          data-testid="med-taken"
                        >
                          <Icon name="check" size={16} strokeWidth={2} />
                          {t("meds.markTaken")}
                        </button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-small text-ink-2">{t("meds.todayHint")}</p>
          </>
        )}
      </section>

      <section className="card mt-3 p-5">
        <div className="flex items-center justify-between">
          <p className="label-micro">{t("meds.schedule")}</p>
          {canEdit ? (
            <button type="button" className="font-medium text-accent-ink" onClick={() => setTimesOpen(true)}>{t("meds.edit")}</button>
          ) : null}
        </div>
        <ul className="mt-3 space-y-2">
          {med.times.map((time) => (
            <li key={time} className="flex items-center gap-2">
              <Icon name="clock" size={16} />
              <span className="text-[18px]">{formatClock(time, locale)}</span>
              <span className="text-small text-ink-2">{scheduleLabel(med, t, locale)}</span>
            </li>
          ))}
        </ul>
      </section>

      {med.trackSupply ? (
        <button type="button" className="card mt-3 w-full p-4 text-left" onClick={() => canEdit && setRefillOpen(true)}>
          <div className="flex items-center justify-between">
            <p className="label-micro">{t("meds.refill")}</p>
            <p className="text-small text-ink-2">{t("meds.units", { left: formatNumber(med.stock, locale), pack: formatNumber(med.packSize || med.stock, locale) })}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-alt">
            <div className={`h-full ${isLow(med) ? "bg-warn" : "bg-accent"}`} style={{ width: `${Math.min(100, med.packSize ? (med.stock / med.packSize) * 100 : 0)}%` }} />
          </div>
          {supplyDays !== null && isLow(med) ? <p className="mt-2 text-small font-medium text-warn">{t("meds.daysLeft", { count: formatNumber(supplyDays, locale) })}</p> : null}
        </button>
      ) : null}

      {canEdit ? (
        <button type="button" className="btn btn-secondary mt-4 text-warn" onClick={() => setPaused(med.id, !med.paused, personId)}>
          {med.paused ? t("meds.resume") : t("meds.pause")}
        </button>
      ) : null}
      </div>
      </div>

      {timesOpen ? (
        <TimesSheet med={med} personId={personId} onClose={() => setTimesOpen(false)} />
      ) : null}
      {refillOpen ? (
        <Sheet title={t("meds.refill")} onClose={() => setRefillOpen(false)}>
          <label className="text-small text-ink-2" htmlFor="add-stock">{t("today.refillAdd")}</label>
          <input id="add-stock" className="field mt-2 w-full" inputMode="numeric" value={add} onChange={(event) => setAdd(Number(event.target.value) || 0)} />
          <label className="mt-4 block text-small text-ink-2" htmlFor="remind-at">{t("form.remindAt")}</label>
          <input id="remind-at" className="field mt-2 w-full" inputMode="numeric" value={med.refillAt} onChange={(event) => setSupply(med.id, { refillAt: Number(event.target.value) || 0 }, personId)} />
          <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => { refill(med.id, Math.max(0, add), personId); setRefillOpen(false); }}>{t("today.save")}</button>
          <button type="button" className="btn btn-danger mt-3 w-full" onClick={() => setConfirmDelete(true)}>{t("meds.delete")}</button>
        </Sheet>
      ) : null}
      {confirmDelete ? (
        <Sheet title={t("meds.deleteTitle")} onClose={() => setConfirmDelete(false)}>
          <p className="text-ink-2">{t("meds.deleteBody")}</p>
          <button type="button" className="btn btn-danger mt-4 w-full" onClick={() => { deleteMedicine(med.id, personId); router.push(personId ? `/care/${personId}` : "/medicines"); }}>{t("meds.delete")}</button>
        </Sheet>
      ) : null}
    </div>
  );
}

function TimesSheet({ med, personId, onClose }: { med: Medicine; personId?: string; onClose: () => void }) {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const { saveMedicine } = useCare();
  const [times, setTimes] = useState(med.times);
  const [draft, setDraft] = useState("20:00");
  return (
    <Sheet title={t("meds.editTimes")} onClose={onClose}>
      <ul className="space-y-2">
        {times.map((time) => (
          <li key={time} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
            <span>{formatClock(time, locale)}</span>
            {times.length > 1 ? (
              <button type="button" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-bg-alt" aria-label={t("form.removeTime")} onClick={() => setTimes(times.filter((item) => item !== time))}><Icon name="close" size={18} /></button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input className="field min-w-0 flex-1" type="time" value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="button" className="btn btn-secondary" onClick={() => { if (draft && !times.includes(draft)) setTimes([...times, draft].sort()); }}>{t("form.addTime")}</button>
      </div>
      <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => { saveMedicine({ ...med, times }, personId); onClose(); }}>{t("common.save")}</button>
    </Sheet>
  );
}

export function MedicineForm({
  existingId,
  personId,
}: {
  existingId?: string;
  personId?: string;
}) {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { profile, saveMedicine } = useCare();
  const person = personId ? profile.people.find((item) => item.id === personId) : undefined;
  const existing = (person ? person.medicines : profile.medicines).find((item) => item.id === existingId);
  const [step, setStep] = useState(existing ? 1 : 1);
  const [med, setMed] = useState<Medicine>(() => existing ? { ...existing } : blankMedicine());
  const [soundOpen, setSoundOpen] = useState(false);
  const [intervalOpen, setIntervalOpen] = useState(false);
  const patch = (partial: Partial<Medicine>) => setMed((current) => ({ ...current, ...partial }));
  const backTo = personId ? `/care/${personId}` : "/medicines";
  // Errors show only after the person tries to continue, never while typing.
  const [tried, setTried] = useState(false);
  const nameError = !med.name.trim() ? t("form.nameRequired") : null;
  const dateError = med.endDate && med.endDate < med.startDate ? t("form.endBeforeStart") : null;
  const timesError = med.times.length === 0 || med.times.some((time) => !time) ? t("form.timesRequired") : null;
  const [initialTimes] = useState(() => (existing ? [...existing.times] : ["08:00"]));
  const packError = med.trackSupply && !(med.packSize > 0) ? t("form.packRequired") : null;
  const stepError = step === 1 ? nameError : step === 2 ? dateError ?? timesError : packError;
  const stepValid = !stepError;

  function next() {
    if (!stepValid) {
      setTried(true);
      document.getElementById(step === 1 ? "med-name" : "med-ends")?.focus();
      return;
    }
    setTried(false);
    setStep((value) => value + 1);
  }

  function save() {
    const next = { ...med, name: med.name.trim() };
    if (!next.name || next.times.length === 0 || dateError || packError) return;
    saveMedicine(next, personId);
    router.push(existing ? `${personId ? `/care/${personId}/med` : "/medicines"}/${next.id}` : backTo);
  }

  return (
    <div className="container-page py-8 lg:py-10">
    <div className="mx-auto max-w-3xl">
      <ScreenHeader
        eyebrow={t("form.step", { step: formatNumber(step, locale) })}
        title={step === 1 ? (existing ? t("form.editTitle") : t("form.addTitle")) : step === 2 ? t("form.when") : t("form.supplyTitle")}
        onBack={() => (step === 1 ? router.push(backTo) : setStep((value) => value - 1))}
      />
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[1, 2, 3].map((n) => <span key={n} className={`h-1.5 rounded-full ${n <= step ? "bg-accent" : "track-off"}`} />)}
      </div>

      {step === 1 && (
        <div className="mt-5 space-y-4">
          <p className="text-small text-ink-2">{t("form.requiredNote")}</p>
          <div>
            <label className="block text-small text-ink-2" htmlFor="med-name">
              {t("form.name")} <span className="text-danger" aria-hidden>*</span>
            </label>
            <input
              id="med-name"
              required
              aria-required
              aria-invalid={tried && !!nameError}
              aria-describedby={tried && nameError ? "med-name-error" : undefined}
              className={`field mt-2 w-full ${tried && nameError ? "!border-danger" : ""}`}
              placeholder={t("form.namePh")}
              value={med.name}
              onBlur={() => setTried(true)}
              onChange={(event) => patch({ name: event.target.value })}
            />
            {tried && nameError ? <p id="med-name-error" className="mt-1.5 text-small text-danger" role="alert">{nameError}</p> : null}
          </div>
          <div>
          <p className="text-small text-ink-2">{t("form.form")}</p>
          <div className="mt-2 grid grid-cols-4 gap-2 rounded-[18px] bg-bg-alt p-2">
            {FORMS.map((form) => (
              <button key={form} type="button" aria-pressed={med.form === form} onClick={() => patch({ form })} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[12px] ${med.form === form ? "bg-accent-soft text-accent-ink" : "text-ink-2"}`}>
                <Icon name={form === "tablet" ? "pill" : form === "capsule" ? "capsule" : form === "liquid" ? "drop" : "syringe"} size={18} />
                {t(`form.${form}`)}
              </button>
            ))}
          </div>
          </div>
          {/* Stacks under the label on a phone so "1 tablet" is never crushed. */}
          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t("form.amount")}</p>
              <p className="text-small text-ink-2">{t("form.amountHint")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line text-[20px]" onClick={() => patch({ amount: Math.max(1, med.amount - 1) })} aria-label="-">−</button>
              <span className="min-w-20 flex-1 text-center sm:flex-none">{med.amount} {t(`unit.${unitKey(med.form)}`)}</span>
              <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line text-[20px]" onClick={() => patch({ amount: med.amount + 1 })} aria-label="+">+</button>
            </div>
          </div>
          <div>
            <p className="text-small text-ink-2">{t("form.color")}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {COLORS.map((color) => (
                <button key={color} type="button" aria-label={color} aria-pressed={med.color === color} onClick={() => patch({ color })} className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: MED_COLORS[color].bg, color: MED_COLORS[color].fg, outline: med.color === color ? "2px solid var(--accent)" : undefined, outlineOffset: 2 }}>
                  {med.color === color ? <Icon name="check" size={18} /> : null}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-small text-ink-2" htmlFor="condition">{t("form.condition")} <span className="text-ink-3">({t("form.optional")})</span></label>
            <input id="condition" className="field mt-2 w-full" placeholder={t("form.conditionPh")} value={med.condition} onChange={(event) => patch({ condition: event.target.value })} />
          </div>
          <div>
            <label className="block text-small text-ink-2" htmlFor="notes">{t("form.notes")} <span className="text-ink-3">({t("form.optional")})</span></label>
            <textarea id="notes" className="field mt-2 min-h-24 w-full py-3" placeholder={t("form.notesPh")} value={med.sideEffects} onChange={(event) => patch({ sideEffects: event.target.value })} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-5 space-y-4">
          <p className="text-small text-ink-2">{med.name || t("form.namePh")} · {med.amount} {t(`unit.${unitKey(med.form)}`)}</p>
          <p className="text-small text-ink-2">{t("form.repeats")}</p>
          <Segmented<Repeat>
            label={t("form.repeats")}
            value={med.repeat}
            onChange={(repeat) => patch({ repeat })}
            options={[
              { value: "daily", label: t("form.daily") },
              { value: "weekly", label: t("form.weekly") },
              { value: "custom", label: t("form.custom") },
            ]}
          />
          {med.repeat === "weekly" ? (
            <div className="grid grid-cols-7 gap-1">
              {WEEK.map((day) => {
                const on = med.weekdays.includes(day);
                const label = new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2024, 0, day === 0 ? 7 : day));
                return (
                  <button key={day} type="button" aria-pressed={on} onClick={() => patch({ weekdays: on ? med.weekdays.filter((item) => item !== day) : [...med.weekdays, day] })} className={`min-h-11 rounded-full text-[13px] ${on ? "bg-accent text-on-accent" : "bg-bg-alt text-ink-2"}`}>{label}</button>
                );
              })}
            </div>
          ) : null}
          {med.repeat === "custom" ? (
            <button type="button" className="card flex w-full items-center justify-between p-4" onClick={() => setIntervalOpen(true)}>
              <span>{t("meds.everyN", { count: formatNumber(med.intervalDays, locale) })}</span>
              <Icon name="chevron" size={18} />
            </button>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <p className="text-small text-ink-2">{t("form.times")} <span className="text-danger" aria-hidden>*</span></p>
            {/* Back to the saved times (or 8:00 for a new medicine). */}
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-small font-medium text-accent-ink hover:bg-bg-alt disabled:opacity-50"
              disabled={sameTimes(med.times, initialTimes)}
              onClick={() => patch({ times: [...initialTimes] })}
              data-testid="times-reset"
            >
              <Icon name="snooze" size={16} />
              {t("form.resetTimes")}
            </button>
          </div>
          {/* Quick pick: tap to add or remove a common time. */}
          <div>
            <p className="sr-only">{t("form.quickTimes")}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("form.quickTimes")}>
              {QUICK_TIMES.map((time) => {
                const on = med.times.includes(time);
                return (
                  <button
                    key={time}
                    type="button"
                    aria-pressed={on}
                    onClick={() => patch({ times: on ? med.times.filter((item) => item !== time) : [...med.times, time].sort() })}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[14px] ${on ? "border-accent bg-accent-soft font-medium text-accent-ink" : "border-line text-ink-2 hover:text-ink"}`}
                  >
                    {on ? <Icon name="check" size={14} strokeWidth={2.4} /> : null}
                    {formatClock(time, locale)}
                  </button>
                );
              })}
            </div>
          </div>
          {med.times.map((time, index) => (
            // Keyed by position: editing one time to match another must not
            // merge the two rows.
            <div key={index} className="card flex items-center gap-3 px-3">
              <Icon name="clock" size={18} />
              {/* The time in the page's language (the browser's own picker
                  may show English digits); the picker changes it. */}
              <span className="min-w-0 flex-1 text-[17px] font-medium">{time ? formatClock(time, locale) : "—"}</span>
              <input
                className="min-h-12 w-[8.5rem] shrink-0 bg-transparent text-ink-2"
                type="time"
                aria-label={t("form.changeTime", { n: formatNumber(index + 1, locale) })}
                value={time}
                onChange={(event) => patch({ times: med.times.map((item, i) => (i === index ? event.target.value : item)) })}
              />
              {med.times.length > 1 ? (
                <button type="button" className="-mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-bg-alt" aria-label={t("form.removeTime")} onClick={() => patch({ times: med.times.filter((_, i) => i !== index) })}>
                  <Icon name="close" size={18} />
                </button>
              ) : null}
            </div>
          ))}
          <button type="button" className="min-h-12 w-full rounded-[18px] border border-dashed border-line text-ink-2 hover:text-ink" onClick={() => patch({ times: [...med.times, nextFreeTime(med.times)] })}>
            <Icon name="plus" size={16} /> {t("form.addTime")}
          </button>
          <p className="text-small text-ink-2">{t("form.food")}</p>
          <Segmented<Food>
            label={t("form.food")}
            value={med.food}
            onChange={(food) => patch({ food })}
            options={[
              { value: "with", label: t("food.with") },
              { value: "empty", label: t("food.empty") },
              { value: "either", label: t("food.either") },
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="card p-3 text-small text-ink-2">
              {t("form.starts")}
              <input className="mt-1 w-full bg-transparent text-[16px] text-ink" type="date" value={med.startDate} onChange={(event) => patch({ startDate: event.target.value || todayKey() })} />
            </label>
            {/* The date picker can't offer days before the start; a typed or
                older value is still caught below. */}
            <label className={`card p-3 text-small text-ink-2 ${dateError ? "!border-danger" : ""}`}>
              {t("form.ends")} <span className="text-ink-3">({t("form.optional")})</span>
              <input
                id="med-ends"
                className="mt-1 w-full bg-transparent text-[16px] text-ink"
                type="date"
                min={med.startDate}
                aria-invalid={!!dateError}
                aria-describedby={dateError ? "med-ends-error" : undefined}
                value={med.endDate ?? ""}
                onChange={(event) => patch({ endDate: event.target.value || null })}
              />
              {!med.endDate ? <span className="mt-1 block text-ink">{t("form.ongoing")}</span> : null}
            </label>
          </div>
          {dateError ? <p id="med-ends-error" className="-mt-2 text-small text-danger" role="alert">{dateError}</p> : null}
          {tried && timesError ? <p className="-mt-2 text-small text-danger" role="alert">{timesError}</p> : null}
          <button type="button" className="card flex w-full items-center justify-between p-4" onClick={() => setSoundOpen(true)}>
            <span>{t("form.sound")}</span>
            <span className="text-accent-ink">{t(`sound.${med.alertSound}`)} <Icon name="chevron" size={16} /></span>
          </button>
          <div className="card flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{t("form.loud")}</p>
              <p className="text-small text-ink-2">{t("form.loudHint")}</p>
            </div>
            <Toggle on={med.extraLoud} label={t("form.loud")} onChange={(extraLoud) => patch({ extraLoud })} />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-5">
          <p className="text-ink-2">{t("form.supplyHint")}</p>
          <div className="card mt-4 flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{t("form.track")}</p>
              <p className="text-small text-ink-2">{t("form.trackHint")}</p>
            </div>
            <Toggle on={med.trackSupply} label={t("form.track")} onChange={(trackSupply) => patch({ trackSupply })} />
          </div>
          {med.trackSupply ? (
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-small text-ink-2" htmlFor="stock">{t("form.stock")}</label>
                <input id="stock" className="field mt-2 w-full" inputMode="numeric" value={med.stock} onChange={(event) => patch({ stock: Number(event.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-small text-ink-2" htmlFor="pack">{t("form.pack")} <span className="text-danger" aria-hidden>*</span></label>
                <input id="pack" className="field mt-2 w-full" inputMode="numeric" value={med.packSize} onChange={(event) => patch({ packSize: Number(event.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-small text-ink-2" htmlFor="at">{t("form.remindAt")}</label>
                <input id="at" className="field mt-2 w-full" inputMode="numeric" value={med.refillAt} onChange={(event) => patch({ refillAt: Number(event.target.value) || 0 })} />
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Sticks to the bottom, directly above the tab bar, so the main action
          is always reachable and never sits under the bar. The solid band
          lets the fields scroll behind it. */}
      <div className={`${STICKY_ACTION} md:mt-10 md:border-t md:border-line md:pt-6`}>
        {/* A standard form footer: Back on the left, the step's main action
            on the right. On a phone the two share one row. The main action
            stays disabled until the step's required fields are filled, and
            the line above it says what is missing. */}
        {stepError ? (
          <p className="mb-2 flex items-center gap-1.5 text-small text-ink-2 md:justify-end" role="status" data-testid="form-missing">
            <span className="text-danger" aria-hidden>*</span>
            {stepError}
          </p>
        ) : null}
        <div className="flex items-center gap-3 md:justify-between">
          <button
            type="button"
            className="btn btn-secondary shrink-0 px-5"
            onClick={() => (step === 1 ? router.push(backTo) : setStep((value) => value - 1))}
          >
            {t("common.back")}
          </button>
          {step < 3 ? (
            <button type="button" className="btn btn-primary min-w-0 flex-1 md:flex-none md:px-8" disabled={!stepValid} onClick={next}>
              {step === 1 ? t("form.continueSchedule") : t("form.continueSupply")}
              <Icon name="chevron" size={18} />
            </button>
          ) : (
            <button type="button" className="btn btn-primary min-w-0 flex-1 md:flex-none md:px-8" disabled={!stepValid} onClick={save}>
              <Icon name="check" size={18} /> {t("form.save")}
            </button>
          )}
        </div>
      </div>

      {soundOpen ? (
        <Sheet title={t("form.sound")} onClose={() => setSoundOpen(false)}>
          <ul className="space-y-2">
            {(["chime", "bell", "soft", "none"] as AlertSound[]).map((sound) => (
              <li key={sound}>
                <button type="button" className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3 ${med.alertSound === sound ? "bg-accent-soft text-accent-ink" : ""}`} onClick={() => { patch({ alertSound: sound }); setSoundOpen(false); }}>
                  {t(`sound.${sound}`)}
                  {med.alertSound === sound ? <Icon name="check" size={16} /> : null}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      ) : null}
      {intervalOpen ? (
        <Sheet title={t("form.pickInterval")} onClose={() => setIntervalOpen(false)}>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 30 }, (_, index) => index + 1).map((count) => (
              <button key={count} type="button" className={`min-h-11 rounded-xl ${med.intervalDays === count ? "bg-accent text-on-accent" : "bg-bg-alt"}`} onClick={() => { patch({ intervalDays: count }); setIntervalOpen(false); }}>{formatNumber(count, locale)}</button>
            ))}
          </div>
        </Sheet>
      ) : null}
    </div>
    </div>
  );
}
