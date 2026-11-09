import type { CarePerson, DoseLog, DoseStatus, MedColor, Medicine, ScheduledDose } from "./types";

export const MED_COLORS: Record<MedColor, { bg: string; fg: string }> = {
  sand: { bg: "#F4E6D4", fg: "#8A5A2A" },
  sky: { bg: "#D7E7EF", fg: "#0B5575" },
  blush: { bg: "#F6DDE6", fg: "#8C3E55" },
  stone: { bg: "#E8E2D8", fg: "#5E564C" },
  mint: { bg: "#D9EFE6", fg: "#1E6B4A" },
};

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function todayKey(now = new Date()): string {
  return dateKey(now);
}

function dayIndex(key: string): number {
  const date = parseDateKey(key);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

export function occursOn(med: Medicine, key: string): boolean {
  if (med.paused) return false;
  if (key < med.startDate) return false;
  if (med.endDate && key > med.endDate) return false;
  if (med.repeat === "daily") return true;
  if (med.repeat === "weekly") return med.weekdays.includes(parseDateKey(key).getDay());
  const span = dayIndex(key) - dayIndex(med.startDate);
  const every = Math.max(1, med.intervalDays || 1);
  return span >= 0 && span % every === 0;
}

export function formatClock(time: string, locale: string): string {
  const [h, m] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  // 12-hour in both languages. Bangla uses its own day periods
  // (সকাল / দুপুর / বিকাল / সন্ধ্যা / রাত্রি) instead of a Latin "PM".
  if (locale === "bn" || locale.startsWith("bn")) {
    return new Intl.DateTimeFormat("bn-BD", {
      hour: "numeric",
      minute: "2-digit",
      dayPeriod: "short",
      numberingSystem: "beng",
    }).format(date);
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function greetingKey(now = new Date()): "morning" | "afternoon" | "evening" {
  const hour = now.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function isPast(date: string, time: string, now = new Date()): boolean {
  const today = todayKey(now);
  if (date < today) return true;
  if (date > today) return false;
  const [h, m] = time.split(":").map(Number);
  return h < now.getHours() || (h === now.getHours() && (m || 0) <= now.getMinutes());
}

function findLog(logs: DoseLog[], medicineId: string, date: string, time: string) {
  return logs.find((log) => log.medicineId === medicineId && log.date === date && log.time === time);
}

export function effectiveStatus(log: DoseLog | undefined, now: Date): DoseStatus {
  if (!log) return "due";
  if (log.status === "snoozed") {
    if (log.snoozeUntil && new Date(log.snoozeUntil).getTime() > now.getTime()) return "snoozed";
    return "due";
  }
  return log.status;
}

export function scheduledDoses(
  medicines: Medicine[],
  logs: DoseLog[],
  key: string,
  now = new Date(),
): ScheduledDose[] {
  const doses: ScheduledDose[] = [];
  for (const medicine of medicines) {
    if (!occursOn(medicine, key)) continue;
    for (const time of [...medicine.times].sort()) {
      doses.push({
        medicine,
        date: key,
        time,
        status: effectiveStatus(findLog(logs, medicine.id, key, time), now),
      });
    }
  }
  // Order across medicines too, so "Next" and "Up next" follow the clock.
  return doses.sort((a, b) => a.time.localeCompare(b.time));
}

export function isLow(med: Medicine): boolean {
  return med.trackSupply && med.stock <= Math.max(0, med.refillAt);
}

export function dosesPerDay(med: Medicine): number {
  if (med.repeat === "weekly") return (med.times.length * Math.max(1, med.weekdays.length)) / 7;
  if (med.repeat === "custom") return med.times.length / Math.max(1, med.intervalDays);
  return med.times.length;
}

export function daysOfSupply(med: Medicine): number | null {
  if (!med.trackSupply) return null;
  const per = dosesPerDay(med) * Math.max(1, med.amount);
  if (per <= 0) return null;
  return Math.max(0, Math.round(med.stock / per));
}

export type DayMark = "none" | "all" | "some" | "most" | "today" | "future";

export function dayMark(medicines: Medicine[], logs: DoseLog[], key: string, now = new Date()): DayMark {
  const doses = scheduledDoses(medicines, logs, key, now);
  const today = todayKey(now);
  if (doses.length === 0) return key === today ? "today" : "none";
  if (key > today) return "future";
  const taken = doses.filter((dose) => dose.status === "taken").length;
  const missed = doses.filter(
    (dose) => dose.status === "skipped" || (dose.status !== "taken" && isPast(key, dose.time, now)),
  ).length;
  if (taken === doses.length) return "all";
  if (key === today && missed === 0) return "today";
  if (missed >= doses.length) return "most";
  if (missed > 0) return "some";
  return "today";
}

export function monthGrid(year: number, month: number): { key: string; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const cells: { key: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    cells.push({ key: dateKey(date), inMonth: date.getMonth() === month });
  }
  while (cells.length > 28 && cells.slice(-7).every((cell) => !cell.inMonth)) cells.splice(-7, 7);
  return cells;
}

export function monthStats(medicines: Medicine[], logs: DoseLog[], year: number, month: number, now = new Date()) {
  let taken = 0;
  let missed = 0;
  const last = new Date(year, month + 1, 0).getDate();
  const today = todayKey(now);
  for (let day = 1; day <= last; day += 1) {
    const key = dateKey(new Date(year, month, day));
    if (key > today) break;
    for (const dose of scheduledDoses(medicines, logs, key, now)) {
      if (dose.status === "taken") taken += 1;
      else if (dose.status === "skipped" || isPast(key, dose.time, now)) missed += 1;
    }
  }
  const total = taken + missed;
  let streak = 0;
  let cursor = today;
  for (let i = 0; i < 400; i += 1) {
    const doses = scheduledDoses(medicines, logs, cursor, now).filter(
      (dose) => cursor < today || isPast(cursor, dose.time, now),
    );
    if (doses.length === 0) {
      if (cursor === today) {
        cursor = addDays(cursor, -1);
        continue;
      }
      break;
    }
    if (doses.every((dose) => dose.status === "taken")) {
      streak += 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    break;
  }
  return { percent: total === 0 ? 0 : Math.round((taken / total) * 100), missed, streak };
}

export function weekMarks(med: Medicine, logs: DoseLog[], now = new Date()) {
  const today = todayKey(now);
  const offset = (parseDateKey(today).getDay() + 6) % 7;
  const monday = addDays(today, -offset);
  return Array.from({ length: 7 }, (_, index) => {
    const key = addDays(monday, index);
    if (!occursOn(med, key)) return { key, state: "off" as const };
    const doses = scheduledDoses([med], logs, key, now);
    const taken = doses.filter((dose) => dose.status === "taken").length;
    if (key > today) return { key, state: "future" as const };
    if (doses.length > 0 && taken === doses.length) return { key, state: "done" as const };
    if (key === today) return { key, state: "today" as const };
    if (taken === 0) return { key, state: "missed" as const };
    return { key, state: "some" as const };
  });
}

export function repeatLine(med: Medicine): "daily" | "weekly" | "custom" {
  return med.repeat;
}

export function blankMedicine(partial: Partial<Medicine> = {}): Medicine {
  return {
    id: crypto.randomUUID(),
    name: "",
    form: "tablet",
    amount: 1,
    color: "sand",
    condition: "",
    sideEffects: "",
    repeat: "daily",
    times: ["08:00"],
    weekdays: [1, 2, 3, 4, 5],
    intervalDays: 2,
    food: "either",
    startDate: todayKey(),
    endDate: null,
    alertSound: "chime",
    extraLoud: false,
    trackSupply: false,
    stock: 0,
    packSize: 30,
    refillAt: 4,
    paused: false,
    ...partial,
  };
}

export function sampleCircle(): CarePerson[] {
  const metformin = blankMedicine({
    id: "sample-metformin",
    name: "Metformin 500mg",
    form: "tablet",
    color: "sand",
    condition: "Diabetes",
    food: "with",
    times: ["08:00", "14:00", "16:00"],
    startDate: "2020-01-01",
    trackSupply: true,
    stock: 24,
    packSize: 30,
    refillAt: 6,
  });
  const vitamin = blankMedicine({
    id: "sample-vitamin",
    name: "Vitamin D3 drops",
    form: "liquid",
    color: "sky",
    times: ["08:00"],
    repeat: "weekly",
    weekdays: [5],
    startDate: "2020-01-01",
  });
  return [
    {
      id: "person-rahim",
      name: "Rahim Chowdhury",
      pending: true,
      permissions: { seeDoses: true, markDoses: false, editMedicines: false, seeHistory: true },
      medicines: [],
    },
    {
      id: "person-nusrat",
      name: "Nusrat Islam",
      pending: false,
      permissions: { seeDoses: true, markDoses: true, editMedicines: true, seeHistory: true },
      medicines: [metformin, vitamin],
    },
  ];
}

export function unitKey(form: Medicine["form"]): "tablet" | "capsule" | "tsp" | "dose" {
  if (form === "capsule") return "capsule";
  if (form === "liquid") return "tsp";
  if (form === "injection") return "dose";
  return "tablet";
}
