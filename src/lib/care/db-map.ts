import type { AlertSound, CarePerson, DoseLog, Food, MedColor, MedForm, Medicine, Permissions, Repeat } from "./types";
import { todayKey } from "./schedule";

const COLORS: MedColor[] = ["sand", "sky", "blush", "stone", "mint"];

export type DbMedicine = {
  id: string;
  patient_id: string;
  name: string;
  dosage: string | null;
  form: string;
  color_idx: number;
  purpose: string | null;
  food: string | null;
  stock_remaining: number | string | null;
  stock_total: number | string | null;
  notes: string | null;
  start_date: string;
  end_date: string | null;
  stock_alert_threshold_days: number | null;
  stock_alert_threshold_units: number | string | null;
  importance: boolean;
  reminder_sound: string | null;
  refill_threshold_mode: string;
};

export type DbSchedule = {
  medicine_id: string;
  times_json: unknown;
  frequency_type: string;
  days_of_week: string[] | null;
  interval_hours: number | null;
  is_paused: boolean;
  dose_quantity: number | string | null;
};

export type DbDose = {
  medicine_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  snooze_until: string | null;
};

export type DbLink = {
  id: string;
  patient_id: string;
  caregiver_user_id: string | null;
  status: string;
  permissions: unknown;
  invite_code: string | null;
};

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function padTime(time: string): string {
  const [h, m] = time.split(":");
  return `${String(Number(h) || 0).padStart(2, "0")}:${String(Number(m) || 0).padStart(2, "0")}`;
}

function colorFromIdx(idx: number): MedColor {
  return COLORS[idx] ?? "sand";
}

function colorToIdx(color: MedColor): number {
  const index = COLORS.indexOf(color);
  return index < 0 ? 0 : index;
}

function formFromDb(form: string): MedForm {
  if (form === "capsule") return "capsule";
  if (form === "drop" || form === "liquid") return "liquid";
  if (form === "injection") return "injection";
  return "tablet";
}

function formToDb(form: MedForm): string {
  if (form === "capsule") return "capsule";
  if (form === "liquid") return "drop";
  if (form === "injection") return "injection";
  return "pill";
}

function foodFromDb(food: string | null): Food {
  if (!food) return "either";
  const value = food.toLowerCase();
  if (value.includes("empty")) return "empty";
  if (value.includes("with")) return "with";
  return "either";
}

function foodToDb(food: Food): string | null {
  if (food === "with") return "with food";
  if (food === "empty") return "empty stomach";
  return null;
}

function soundFromDb(sound: string | null): AlertSound {
  if (sound === "bell" || sound === "alarm") return "bell";
  if (sound === "soft") return "soft";
  if (sound === "none") return "none";
  return "chime";
}

function soundToDb(sound: AlertSound): string | null {
  return sound === "none" ? null : sound;
}

function amountFrom(dosage: string | null, quantity: number | string | null): number {
  const qty = quantity == null ? NaN : Number(quantity);
  if (Number.isFinite(qty) && qty > 0) return qty;
  const match = dosage?.match(/[\d.]+/);
  const parsed = match ? Number(match[0]) : 1;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function asTimes(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) return ["08:00"];
  return value.map((item) => padTime(String(item)));
}

export function medicineFromRows(row: DbMedicine, schedule: DbSchedule | undefined): Medicine {
  const freq = schedule?.frequency_type ?? "daily";
  const repeat: Repeat = freq === "weekly" ? "weekly" : freq === "daily" ? "daily" : "custom";
  const weekdays = (schedule?.days_of_week ?? []).map((day) => Number(day)).filter((day) => day >= 0 && day <= 6);
  const stock = row.stock_remaining == null ? null : Number(row.stock_remaining);
  const refill =
    row.refill_threshold_mode === "units"
      ? Number(row.stock_alert_threshold_units ?? 4)
      : Number(row.stock_alert_threshold_days ?? row.stock_alert_threshold_units ?? 4);
  return {
    id: row.id,
    name: row.name,
    form: formFromDb(row.form),
    amount: amountFrom(row.dosage, schedule?.dose_quantity ?? null),
    color: colorFromIdx(row.color_idx ?? 0),
    condition: row.purpose ?? "",
    sideEffects: row.notes ?? "",
    repeat,
    times: asTimes(schedule?.times_json),
    weekdays: weekdays.length > 0 ? weekdays : [1, 2, 3, 4, 5],
    intervalDays: schedule?.interval_hours ? Math.max(1, Math.round(schedule.interval_hours / 24)) : 2,
    food: foodFromDb(row.food),
    startDate: (row.start_date ?? todayKey()).slice(0, 10),
    endDate: row.end_date ? row.end_date.slice(0, 10) : null,
    alertSound: soundFromDb(row.reminder_sound),
    extraLoud: Boolean(row.importance),
    trackSupply: stock != null,
    stock: Number.isFinite(stock ?? NaN) ? (stock as number) : 0,
    packSize: row.stock_total == null ? 30 : Number(row.stock_total),
    refillAt: Number.isFinite(refill) ? refill : 4,
    paused: Boolean(schedule?.is_paused),
  };
}

export function medicineInsert(med: Medicine, patientId: string) {
  return {
    id: med.id,
    patient_id: patientId,
    client_ref: med.id,
    name: med.name.trim() || "Medicine",
    dosage: String(med.amount),
    form: formToDb(med.form),
    color_idx: colorToIdx(med.color),
    purpose: med.condition.trim() || null,
    food: foodToDb(med.food),
    notes: med.sideEffects.trim() || null,
    start_date: med.startDate,
    end_date: med.endDate,
    importance: med.extraLoud,
    reminder_sound: soundToDb(med.alertSound),
    stock_remaining: med.trackSupply ? med.stock : null,
    stock_total: med.trackSupply ? med.packSize : null,
    refill_threshold_mode: "units",
    stock_alert_threshold_units: med.trackSupply ? med.refillAt : null,
    refill_reminder_enabled: med.trackSupply,
    archived_at: null,
    updated_at: new Date().toISOString(),
  };
}

export function medicinePatch(med: Medicine) {
  const { id: _id, patient_id: _patient, client_ref: _ref, ...patch } = medicineInsert(med, med.id);
  return patch;
}

export function scheduleInsert(med: Medicine, patientId: string) {
  return {
    medicine_id: med.id,
    patient_id: patientId,
    times_json: med.times.map(padTime),
    days: med.repeat === "daily" ? "every day" : med.repeat,
    frequency_type: med.repeat === "daily" ? "daily" : med.repeat === "weekly" ? "weekly" : "custom",
    days_of_week: med.repeat === "weekly" ? med.weekdays.map(String) : null,
    interval_hours: med.repeat === "custom" ? Math.max(1, med.intervalDays) * 24 : null,
    timezone: "Asia/Dhaka",
    is_paused: med.paused,
    dose_quantity: med.amount,
    updated_at: new Date().toISOString(),
  };
}

export function logFromDb(row: DbDose): DoseLog | null {
  if (row.status !== "taken" && row.status !== "skipped" && row.status !== "snoozed") return null;
  return {
    medicineId: row.medicine_id,
    date: row.scheduled_date.slice(0, 10),
    time: padTime(row.scheduled_time),
    status: row.status,
    snoozeUntil: row.snooze_until ?? undefined,
  };
}

export function permsFromDb(raw: unknown): Permissions {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const on = (key: string, fallback: boolean) => (typeof value[key] === "boolean" ? Boolean(value[key]) : fallback);
  return {
    seeDoses: on("receive_alerts", true),
    markDoses: on("change_dose_status", false),
    editMedicines: on("manage_medicines", false) || on("edit_schedule", false) || on("add_medicine", false),
    seeHistory: on("view_history", true),
  };
}

export function permsToDb(perms: Permissions) {
  return {
    receive_alerts: perms.seeDoses,
    change_dose_status: perms.markDoses,
    manage_medicines: perms.editMedicines,
    edit_schedule: perms.editMedicines,
    add_medicine: perms.editMedicines,
    view_history: perms.seeHistory,
  };
}

export function personFromLink(link: DbLink, name: string, medicines: Medicine[], userId: string): CarePerson {
  return {
    id: link.id,
    userId,
    name: name || link.invite_code || "—",
    pending: link.status !== "active",
    permissions: permsFromDb(link.permissions),
    medicines,
  };
}
