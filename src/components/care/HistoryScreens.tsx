"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  dayMark,
  formatClock,
  isPast,
  monthGrid,
  monthStats,
  scheduledDoses,
  todayKey,
} from "@/lib/care/schedule";
import { DATE_LOCALE, formatNumber, formatPercent } from "@/lib/format";
import type { DoseLog, ScheduledDose } from "@/lib/care/types";
import { Icon, ScreenHeader, Sheet } from "./chrome";
import { useCare } from "./store";

export function HistoryScreen() {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { profile } = useCare();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [exportOpen, setExportOpen] = useState(false);
  const cells = monthGrid(cursor.year, cursor.month);
  const stats = monthStats(profile.medicines, profile.logs, cursor.year, cursor.month, now);
  const title = new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    month: "long",
    year: "numeric",
    ...(locale === "bn" ? { numberingSystem: "beng" as const } : null),
  }).format(new Date(cursor.year, cursor.month, 1));
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(DATE_LOCALE[locale], { weekday: "narrow" }).format(new Date(2024, 0, index + 1)),
  );

  function shift(delta: number) {
    const date = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: date.getFullYear(), month: date.getMonth() });
  }

  function printRange(days: number) {
    const end = todayKey(now);
    const start = days === 0 ? `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-01` : shiftKey(end, -days);
    const lines: string[] = [`<h1>${t("history.title")}</h1>`, `<p>${start} – ${end}</p>`, "<ul>"];
    let key = start;
    const stop = days === 0 ? `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(new Date(cursor.year, cursor.month + 1, 0).getDate()).padStart(2, "0")}` : end;
    while (key <= stop) {
      const doses = scheduledDoses(profile.medicines, profile.logs, key, now);
      if (doses.length) {
        lines.push(`<li><strong>${key}</strong><ul>`);
        for (const dose of doses) lines.push(`<li>${dose.time} ${dose.medicine.name} — ${dose.status}</li>`);
        lines.push("</ul></li>");
      }
      key = shiftKey(key, 1);
    }
    lines.push("</ul>");
    const node = document.getElementById("print-history");
    if (node) node.innerHTML = lines.join("");
    document.body.classList.add("dc-printing");
    window.print();
    document.body.classList.remove("dc-printing");
    setExportOpen(false);
  }

  return (
    <div className="container-page py-8 lg:py-10">
      <ScreenHeader title={t("history.title")} onBack={() => router.push("/")} />
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <div>
      <div className="flex items-center justify-between">
        <button type="button" className="flex h-11 w-11 items-center justify-center" aria-label={t("history.prev")} onClick={() => shift(-1)}><Icon name="back" /></button>
        <h2 className="text-[22px]">{title}</h2>
        <button type="button" className="flex h-11 w-11 items-center justify-center" aria-label={t("history.next")} onClick={() => shift(1)}><Icon name="chevron" /></button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[12px] text-ink-3">
        {weekdays.map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const mark = dayMark(profile.medicines, profile.logs, cell.key, now);
          const day = Number(cell.key.slice(-2));
          return (
            <button
              key={cell.key}
              type="button"
              disabled={!cell.inMonth}
              onClick={() => router.push(`/history/${cell.key}`)}
              className={`flex aspect-square flex-col items-center justify-center rounded-2xl text-[13px] ${
                !cell.inMonth ? "invisible" :
                mark === "all" ? "bg-accent-soft text-accent-ink" :
                mark === "some" ? "bg-[#F4E6D4] text-ink" :
                mark === "most" ? "bg-warn-soft text-warn" :
                mark === "today" ? "border border-ink bg-surface" :
                "bg-bg-alt text-ink-2"
              }`}
            >
              {formatNumber(day, locale)}
            </button>
          );
        })}
      </div>
      </div>
      <div>
      <div className="grid grid-cols-3 gap-2">
        <Stat value={formatPercent(stats.percent, locale)} label={t("history.onTime")} />
        <Stat value={formatNumber(stats.missed, locale)} label={t("history.missed")} warn />
        <Stat value={formatNumber(stats.streak, locale)} label={t("history.streak")} />
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-2">
        <li>{t("history.allTaken")}</li>
        <li>{t("history.someMissed")}</li>
        <li>{t("history.mostMissed")}</li>
        <li>{t("history.nothing")}</li>
        <li>{t("history.today")}</li>
      </ul>
      <button type="button" className="btn btn-primary mt-6" onClick={() => setExportOpen(true)}>{t("history.export")}</button>
      </div>
      </div>
      <div id="print-history" className="hidden" />
      {exportOpen ? (
        <Sheet title={t("history.export")} onClose={() => setExportOpen(false)}>
          <button type="button" className="btn btn-secondary mb-2 w-full" onClick={() => printRange(0)}>{t("history.rangeMonth")}</button>
          <button type="button" className="btn btn-secondary w-full" onClick={() => printRange(30)}>{t("history.range30")}</button>
        </Sheet>
      ) : null}
    </div>
  );
}

export function HistoryDay({ date }: { date: string }) {
  const t = useTranslations("care");
  const locale = useLocale();
  const router = useRouter();
  const { ready, profile, markDose } = useCare();
  const [editing, setEditing] = useState<ScheduledDose | null>(null);
  const doses = useMemo(() => scheduledDoses(profile.medicines, profile.logs, date), [profile.medicines, profile.logs, date]);
  const label = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00`));
  const future = date > todayKey();
  if (!ready) return <div className="min-h-svh" />;

  function setStatus(status: DoseLog["status"]) {
    if (!editing) return;
    markDose({ medicineId: editing.medicine.id, date: editing.date, time: editing.time, status });
    setEditing(null);
  }

  return (
    <div className="container-page py-8 lg:py-10">
      <ScreenHeader title={label} onBack={() => router.push("/history")} />
      {future ? <p className="mt-2 text-small text-ink-2">{t("history.futureNote")}</p> : null}
      {doses.length === 0 ? <p className="mt-8 text-center text-ink-2">{t("history.emptyDay")}</p> : (
        <ul className="mt-4 space-y-2">
          {doses.map((dose) => (
            <li key={`${dose.medicine.id}-${dose.time}`}>
              <button type="button" className="card flex w-full items-center justify-between p-4 text-left" onClick={() => setEditing(dose)}>
                <span>
                  <span className="block font-medium">{dose.medicine.name}</span>
                  <span className="text-small text-ink-2">{formatClock(dose.time, locale)} · {t(`history.status.${shownStatus(dose)}`)}</span>
                </span>
                <Icon name="chevron" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <Sheet title={editing.medicine.name} onClose={() => setEditing(null)}>
          <p className="mb-3 text-ink-2">{t("history.correct")}</p>
          <button type="button" className="btn btn-primary w-full" onClick={() => setStatus("taken")}>{t("history.taken")}</button>
          <button type="button" className="btn btn-secondary mt-2 w-full" onClick={() => setStatus("skipped")}>{t("history.skipped")}</button>
        </Sheet>
      ) : null}
    </div>
  );
}

function shownStatus(dose: ScheduledDose): "taken" | "skipped" | "missed" | "due" {
  if (dose.status === "taken") return "taken";
  if (dose.status === "skipped") return "skipped";
  if (dose.status !== "snoozed" && isPast(dose.date, dose.time)) return "missed";
  return "due";
}

function Stat({ value, label, warn }: { value: string; label: string; warn?: boolean }) {
  return (
    <div className="card p-3 text-center">
      <p className={`font-heading text-[26px] ${warn ? "text-warn" : ""}`}>{value}</p>
      <p className="text-small text-ink-2">{label}</p>
    </div>
  );
}

function shiftKey(key: string, days: number) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
