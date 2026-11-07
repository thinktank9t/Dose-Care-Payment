"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  MED_COLORS,
  blankMedicine,
  daysOfSupply,
  formatClock,
  isLow,
  todayKey,
  unitKey,
  weekMarks,
} from "@/lib/care/schedule";
import type { AlertSound, Food, MedColor, MedForm, Medicine, Repeat } from "@/lib/care/types";
import { EmptyState, Icon, MedGlyph, ScreenHeader, Segmented, Sheet, Toggle } from "./chrome";
import { useCare } from "./store";

const FORMS: MedForm[] = ["tablet", "capsule", "liquid", "injection"];
const COLORS: MedColor[] = ["sand", "sky", "blush", "stone", "mint"];
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export function MedicinesScreen() {
  const t = useTranslations("care");
  const locale = useLocale();
  const { profile } = useCare();
  const [lowOnly, setLowOnly] = useState(false);
  const meds = lowOnly ? profile.medicines.filter(isLow) : profile.medicines;

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1>{t("meds.title")}</h1>
          <p className="mt-2 text-ink-2">{t("meds.count", { count: profile.medicines.length })}</p>
        </div>
        <button
          type="button"
          aria-pressed={lowOnly}
          aria-label={t("meds.low")}
          onClick={() => setLowOnly((value) => !value)}
          className={`flex h-12 w-12 items-center justify-center rounded-full ${lowOnly ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent-ink"}`}
        >
          <Icon name="battery" size={20} />
        </button>
      </div>
      {profile.medicines.length === 0 ? (
        <EmptyState
          icon={<Icon name="pill" size={40} />}
          title={t("meds.emptyTitle")}
          body={t("meds.emptyBody")}
          action={<Link href="/medicines/new" className="font-medium text-accent-ink">{t("today.add")}</Link>}
        />
      ) : meds.length === 0 ? (
        <p className="mt-8 text-center text-ink-2">{t("meds.noneLow")}</p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {meds.map((med) => (
            <li key={med.id}>
              <Link href={`/medicines/${med.id}`} className="card flex items-start gap-3 p-4">
                <MedGlyph form={med.form} color={med.color} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-medium text-ink">{med.name}</span>
                    <Status med={med} />
                  </span>
                  {med.condition ? <span className="mt-0.5 block text-small text-ink-2">{med.condition}</span> : null}
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-small text-ink-2">
                    <span className="inline-flex items-center gap-1"><Icon name="clock" size={14} />{med.times.map((time) => formatClock(time, locale)).join(", ")}</span>
                    <span>{scheduleLabel(med, t)}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Status({ med }: { med: Medicine }) {
  const t = useTranslations("care");
  if (med.paused) return <span className="pill bg-bg-alt text-ink-2">{t("meds.paused")}</span>;
  return (
    <span className="flex flex-col items-end gap-1">
      <span className="pill bg-accent-soft text-accent-ink">{t("meds.active")}</span>
      {isLow(med) ? <span className="pill bg-warn-soft text-warn">{t("meds.low")}</span> : null}
    </span>
  );
}

function scheduleLabel(med: Medicine, t: ReturnType<typeof useTranslations<"care">>) {
  if (med.repeat === "weekly") return t("meds.weekly");
  if (med.repeat === "custom") return t("meds.everyN", { count: med.intervalDays });
  return t("meds.everyDay");
}

export function MedicineDetail({ id, personId }: { id: string; personId?: string }) {
  const t = useTranslations("care");
  const locale = useLocale();
  const router = useRouter();
  const { ready, profile, setPaused, deleteMedicine, refill, setSupply } = useCare();
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
  const base = personId ? `/care/${personId}` : "/medicines";
  const supplyDays = daysOfSupply(med);
  const taken = marks.filter((mark) => mark.state === "done").length;
  const due = marks.filter((mark) => mark.state !== "off" && mark.state !== "future").length;
  const percent = due === 0 ? 0 : Math.round((taken / due) * 100);

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => router.push(personId ? `/care/${personId}` : "/medicines")} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface" aria-label={t("common.back")}>
          <Icon name="back" />
        </button>
        {canEdit ? <Link href={`${base}/edit/${med.id}`} className="min-h-11 px-2 font-medium text-accent-ink">{t("meds.edit")}</Link> : <span />}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <MedGlyph form={med.form} color={med.color} size={56} />
        <div>
          <div className="flex flex-wrap gap-1.5">
            <span className="pill bg-accent-soft text-accent-ink">{med.paused ? t("meds.paused") : t("meds.active")}</span>
            {isLow(med) ? <span className="pill bg-warn-soft text-warn">{t("meds.low")}</span> : null}
          </div>
          <h1 className="mt-2 text-[30px]">{med.name}</h1>
          {med.condition ? <p className="text-ink-2">{med.condition}</p> : null}
          {person ? <p className="text-small text-ink-2">{t("meds.forPerson", { name: person.name })}</p> : null}
        </div>
      </div>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <p className="label-micro">{t("meds.thisWeek")}</p>
          <p className="font-medium text-accent-ink">{t("meds.onTime", { count: percent })}</p>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center">
          {marks.map((mark) => (
            <div key={mark.key}>
              <span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[11px] ${
                mark.state === "done" ? "bg-accent text-on-accent" :
                mark.state === "missed" ? "bg-warn-soft text-warn" :
                mark.state === "today" ? "border border-dashed border-accent text-accent-ink" :
                "bg-bg-alt text-ink-3"
              }`}>
                {mark.state === "done" ? <Icon name="check" size={14} /> : ""}
              </span>
              <span className="mt-1 block text-[11px] text-ink-3">
                {new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(`${mark.key}T12:00:00`))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div>
      <section className="card p-5">
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
              <span className="text-small text-ink-2">{scheduleLabel(med, t)}</span>
            </li>
          ))}
        </ul>
      </section>

      {med.trackSupply ? (
        <button type="button" className="card mt-3 w-full p-4 text-left" onClick={() => canEdit && setRefillOpen(true)}>
          <div className="flex items-center justify-between">
            <p className="label-micro">{t("meds.refill")}</p>
            <p className="text-small text-ink-2">{t("meds.units", { left: med.stock, pack: med.packSize || med.stock })}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-alt">
            <div className={`h-full ${isLow(med) ? "bg-warn" : "bg-accent"}`} style={{ width: `${Math.min(100, med.packSize ? (med.stock / med.packSize) * 100 : 0)}%` }} />
          </div>
          {supplyDays !== null && isLow(med) ? <p className="mt-2 text-small font-medium text-warn">{t("meds.daysLeft", { count: supplyDays })}</p> : null}
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
  const { saveMedicine } = useCare();
  const [times, setTimes] = useState(med.times);
  const [draft, setDraft] = useState("20:00");
  return (
    <Sheet title={t("meds.editTimes")} onClose={onClose}>
      <ul className="space-y-2">
        {times.map((time) => (
          <li key={time} className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
            <span>{time}</span>
            {times.length > 1 ? (
              <button type="button" aria-label={t("form.removeTime")} onClick={() => setTimes(times.filter((item) => item !== time))}><Icon name="close" size={16} /></button>
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
  const locale = useLocale();
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

  function save() {
    const next = { ...med, name: med.name.trim() };
    if (!next.name || next.times.length === 0) return;
    saveMedicine(next, personId);
    router.push(existing ? `${personId ? `/care/${personId}/med` : "/medicines"}/${next.id}` : backTo);
  }

  return (
    <div className="container-page py-8 lg:py-10">
    <div className="mx-auto max-w-3xl">
      <ScreenHeader
        eyebrow={t("form.step", { step })}
        title={step === 1 ? (existing ? t("form.editTitle") : t("form.addTitle")) : step === 2 ? t("form.when") : t("form.supplyTitle")}
        onBack={() => (step === 1 ? router.push(backTo) : setStep((value) => value - 1))}
      />
      <div className="mt-2 grid grid-cols-3 gap-1.5 px-2">
        {[1, 2, 3].map((n) => <span key={n} className={`h-1 rounded-full ${n <= step ? "bg-accent" : "bg-line"}`} />)}
      </div>

      {step === 1 && (
        <div className="mt-5 space-y-4">
          <label className="block text-small text-ink-2" htmlFor="med-name">{t("form.name")}</label>
          <input id="med-name" className="field -mt-2 w-full" placeholder={t("form.namePh")} value={med.name} onChange={(event) => patch({ name: event.target.value })} />
          <p className="text-small text-ink-2">{t("form.form")}</p>
          <div className="grid grid-cols-4 gap-2 rounded-[18px] bg-bg-alt p-2">
            {FORMS.map((form) => (
              <button key={form} type="button" aria-pressed={med.form === form} onClick={() => patch({ form })} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[12px] ${med.form === form ? "bg-accent-soft text-accent-ink" : "text-ink-2"}`}>
                <Icon name={form === "tablet" ? "pill" : form === "capsule" ? "capsule" : form === "liquid" ? "drop" : "syringe"} size={18} />
                {t(`form.${form}`)}
              </button>
            ))}
          </div>
          <div className="card flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{t("form.amount")}</p>
              <p className="text-small text-ink-2">{t("form.amountHint")}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-line" onClick={() => patch({ amount: Math.max(1, med.amount - 1) })} aria-label="-">−</button>
              <span className="min-w-16 text-center">{med.amount} {t(`unit.${unitKey(med.form)}`)}</span>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-line" onClick={() => patch({ amount: med.amount + 1 })} aria-label="+">+</button>
            </div>
          </div>
          <p className="text-small text-ink-2">{t("form.color")}</p>
          <div className="flex gap-3">
            {COLORS.map((color) => (
              <button key={color} type="button" aria-label={color} aria-pressed={med.color === color} onClick={() => patch({ color })} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: MED_COLORS[color].bg, color: MED_COLORS[color].fg, outline: med.color === color ? "2px solid var(--accent)" : undefined, outlineOffset: 2 }}>
                {med.color === color ? <Icon name="check" size={16} /> : null}
              </button>
            ))}
          </div>
          <label className="block text-small text-ink-2" htmlFor="condition">{t("form.condition")}</label>
          <input id="condition" className="field -mt-2 w-full" placeholder={t("form.conditionPh")} value={med.condition} onChange={(event) => patch({ condition: event.target.value })} />
          <label className="block text-small text-ink-2" htmlFor="notes">{t("form.notes")}</label>
          <textarea id="notes" className="field -mt-2 min-h-24 w-full py-3" placeholder={t("form.notesPh")} value={med.sideEffects} onChange={(event) => patch({ sideEffects: event.target.value })} />
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
              <span>{t("meds.everyN", { count: med.intervalDays })}</span>
              <Icon name="chevron" size={18} />
            </button>
          ) : null}
          <p className="text-small text-ink-2">{t("form.times")}</p>
          {med.times.map((time) => (
            <label key={time} className="card flex items-center gap-2 px-3">
              <Icon name="clock" size={18} />
              <input className="min-h-12 flex-1 bg-transparent" type="time" value={time} onChange={(event) => patch({ times: med.times.map((item) => item === time ? event.target.value : item) })} />
              {med.times.length > 1 ? <button type="button" aria-label={t("form.removeTime")} onClick={() => patch({ times: med.times.filter((item) => item !== time) })}><Icon name="close" size={16} /></button> : null}
            </label>
          ))}
          <button type="button" className="min-h-12 w-full rounded-[18px] border border-dashed border-line text-ink-2" onClick={() => patch({ times: [...med.times, "20:00"] })}>{t("form.addTime")}</button>
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
            <label className="card p-3 text-small text-ink-2">
              {t("form.ends")}
              <input className="mt-1 w-full bg-transparent text-[16px] text-ink" type="date" value={med.endDate ?? ""} onChange={(event) => patch({ endDate: event.target.value || null })} />
              {!med.endDate ? <span className="mt-1 block text-ink">{t("form.ongoing")}</span> : null}
            </label>
          </div>
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
              <label className="block text-small text-ink-2" htmlFor="stock">{t("form.stock")}</label>
              <input id="stock" className="field -mt-2 w-full" inputMode="numeric" value={med.stock} onChange={(event) => patch({ stock: Number(event.target.value) || 0 })} />
              <label className="block text-small text-ink-2" htmlFor="pack">{t("form.pack")}</label>
              <input id="pack" className="field -mt-2 w-full" inputMode="numeric" value={med.packSize} onChange={(event) => patch({ packSize: Number(event.target.value) || 0 })} />
              <label className="block text-small text-ink-2" htmlFor="at">{t("form.remindAt")}</label>
              <input id="at" className="field -mt-2 w-full" inputMode="numeric" value={med.refillAt} onChange={(event) => patch({ refillAt: Number(event.target.value) || 0 })} />
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-8">
        {step < 3 ? (
          <button type="button" className="btn btn-primary w-full" disabled={step === 1 && !med.name.trim()} onClick={() => setStep((value) => value + 1)}>
            {step === 1 ? t("form.continueSchedule") : t("form.continueSupply")}
          </button>
        ) : (
          <button type="button" className="btn btn-primary w-full" onClick={save}>
            <Icon name="check" size={18} /> {t("form.save")}
          </button>
        )}
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
              <button key={count} type="button" className={`min-h-11 rounded-xl ${med.intervalDays === count ? "bg-accent text-on-accent" : "bg-bg-alt"}`} onClick={() => { patch({ intervalDays: count }); setIntervalOpen(false); }}>{count}</button>
            ))}
          </div>
        </Sheet>
      ) : null}
    </div>
    </div>
  );
}
