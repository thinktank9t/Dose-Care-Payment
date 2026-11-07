"use server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  isUuid,
  logFromDb,
  medicineFromRows,
  medicineInsert,
  medicinePatch,
  padTime,
  permsToDb,
  personFromLink,
  scheduleInsert,
  type DbDose,
  type DbLink,
  type DbMedicine,
  type DbSchedule,
} from "@/lib/care/db-map";
import type { DoseLog, Medicine, Permissions } from "@/lib/care/types";
import { isFakeBackend } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

export type RemoteCare = {
  name: string;
  age: number | null;
  reasons: string[];
  inviteCode: string | null;
  medicines: Medicine[];
  logs: DoseLog[];
  people: ReturnType<typeof personFromLink>[];
};

const MED_COLUMNS =
  "id,patient_id,name,dosage,form,color_idx,purpose,food,stock_remaining,stock_total,notes,start_date,end_date,stock_alert_threshold_days,stock_alert_threshold_units,importance,reminder_sound,refill_threshold_mode";

async function context() {
  if (isFakeBackend()) return null;
  try {
    const current = await getCurrentUser();
    if (!current) return null;
    return {
      db: await supabaseServer(),
      userId: current.user.id,
      authId: current.session.authId,
    };
  } catch (error) {
    console.error("care sync unavailable", error);
    return null;
  }
}

function sinceDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

async function loadMedicines(db: Awaited<ReturnType<typeof supabaseServer>>, patientIds: string[]) {
  if (patientIds.length === 0) {
    return { medicines: [] as Medicine[], logs: [] as DoseLog[], byPatient: new Map<string, Medicine[]>() };
  }
  const { data: medRows, error } = await db.from("medicines").select(MED_COLUMNS).in("patient_id", patientIds).is("archived_at", null);
  if (error) throw new Error(error.message);
  const rows = (medRows ?? []) as unknown as DbMedicine[];
  const ids = rows.map((row) => row.id);
  const { data: schedules } = ids.length
    ? await db
        .from("dose_schedules")
        .select("medicine_id,times_json,frequency_type,days_of_week,interval_hours,is_paused,dose_quantity")
        .in("medicine_id", ids)
    : { data: [] };
  const scheduleByMed = new Map<string, DbSchedule>();
  for (const row of (schedules ?? []) as DbSchedule[]) {
    if (!scheduleByMed.has(row.medicine_id)) scheduleByMed.set(row.medicine_id, row);
  }
  const mapped = rows.map((row) => ({
    patientId: row.patient_id,
    medicine: medicineFromRows(row, scheduleByMed.get(row.id)),
  }));
  const { data: doseRows } = ids.length
    ? await db
        .from("dose_logs")
        .select("medicine_id,scheduled_date,scheduled_time,status,snooze_until")
        .in("medicine_id", ids)
        .gte("scheduled_date", sinceDays(120))
    : { data: [] };
  const logs = ((doseRows ?? []) as DbDose[]).map(logFromDb).filter((row): row is DoseLog => row !== null);
  const byPatient = new Map<string, Medicine[]>();
  for (const item of mapped) {
    const list = byPatient.get(item.patientId) ?? [];
    list.push(item.medicine);
    byPatient.set(item.patientId, list);
  }
  return { medicines: mapped.map((item) => item.medicine), logs, byPatient };
}

/** Loads the signed-in account from the production tables the phone app uses. */
export async function pullCare(): Promise<RemoteCare | null> {
  const ctx = await context();
  if (!ctx) return null;
  const { db, userId } = ctx;
  const { data: user, error } = await db.from("users").select("name,age,usage_reasons").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);

  const own = await loadMedicines(db, [userId]);
  const { data: inviteRows } = await db
    .from("caregiver_links")
    .select("invite_code")
    .eq("patient_id", userId)
    .eq("status", "pending")
    .not("invite_code", "is", null)
    .limit(1);
  const { data: caredRows } = await db
    .from("caregiver_links")
    .select("id,patient_id,caregiver_user_id,status,permissions,invite_code")
    .eq("caregiver_user_id", userId)
    .in("status", ["requested", "active"]);
  const cared = (caredRows ?? []) as DbLink[];
  const caredBundle = await loadMedicines(db, cared.filter((link) => link.status === "active").map((link) => link.patient_id));
  const nameIds = cared.map((link) => link.patient_id);
  const { data: names } = nameIds.length ? await db.from("users").select("id,name").in("id", nameIds) : { data: [] };
  const nameOf = new Map((names ?? []).map((row) => [(row as { id: string }).id, (row as { name: string }).name]));
  const reasons = Array.isArray((user as { usage_reasons?: string[] } | null)?.usage_reasons)
    ? (user as { usage_reasons: string[] }).usage_reasons
    : [];

  return {
    name: (user as { name?: string } | null)?.name ?? "",
    age: (user as { age?: number | null } | null)?.age ?? null,
    reasons,
    inviteCode: ((inviteRows ?? [])[0] as { invite_code?: string } | undefined)?.invite_code ?? null,
    medicines: own.medicines,
    logs: own.logs,
    people: cared.map((link) =>
      personFromLink(
        link,
        nameOf.get(link.patient_id) || "",
        link.status === "active" ? caredBundle.byPatient.get(link.patient_id) ?? [] : [],
        link.patient_id,
      ),
    ),
  };
}

export async function pushMedicine(med: Medicine, patientId?: string): Promise<void> {
  const ctx = await context();
  if (!ctx || !isUuid(med.id)) return;
  const owner = patientId && isUuid(patientId) ? patientId : ctx.userId;
  const { data: existing } = await ctx.db.from("medicines").select("id").eq("id", med.id).maybeSingle();
  const saved = existing
    ? await ctx.db.from("medicines").update(medicinePatch(med)).eq("id", med.id)
    : await ctx.db.from("medicines").insert(medicineInsert(med, owner));
  if (saved.error) {
    console.error("medicine save failed", saved.error.message);
    return;
  }
  const schedule = scheduleInsert(med, owner);
  const { data: current } = await ctx.db.from("dose_schedules").select("id").eq("medicine_id", med.id).limit(1).maybeSingle();
  const scheduleSaved = current
    ? await ctx.db.from("dose_schedules").update(schedule).eq("id", (current as { id: string }).id)
    : await ctx.db.from("dose_schedules").insert(schedule);
  if (scheduleSaved.error) console.error("schedule save failed", scheduleSaved.error.message);
}

export async function archiveMedicine(id: string): Promise<void> {
  const ctx = await context();
  if (!ctx || !isUuid(id)) return;
  const { error } = await ctx.db
    .from("medicines")
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("medicine archive failed", error.message);
}

export async function pushDose(entry: DoseLog & { snoozeMinutes?: number }, patientId?: string): Promise<number | null> {
  const ctx = await context();
  if (!ctx || !isUuid(entry.medicineId)) return null;
  const owner = patientId && isUuid(patientId) ? patientId : ctx.userId;
  const time = padTime(entry.time);
  const { data: existing } = await ctx.db
    .from("dose_logs")
    .select("snooze_count")
    .eq("medicine_id", entry.medicineId)
    .eq("scheduled_date", entry.date)
    .eq("scheduled_time", time)
    .maybeSingle();
  const previous = Number((existing as { snooze_count?: number } | null)?.snooze_count ?? 0);
  const { error } = await ctx.db.from("dose_logs").upsert(
    {
      medicine_id: entry.medicineId,
      patient_id: owner,
      scheduled_date: entry.date,
      scheduled_time: time,
      status: entry.status,
      marked_at: new Date().toISOString(),
      marked_by_user_id: ctx.userId,
      source: "web",
      snooze_until: entry.status === "snoozed" ? entry.snoozeUntil ?? new Date(Date.now() + (entry.snoozeMinutes ?? 10) * 60_000).toISOString() : null,
      snooze_count: entry.status === "snoozed" ? previous + 1 : previous,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "medicine_id,scheduled_date,scheduled_time" },
  );
  if (error) {
    console.error("dose save failed", error.message);
    return null;
  }
  const { data } = await ctx.db.from("medicines").select("stock_remaining").eq("id", entry.medicineId).maybeSingle();
  const stock = (data as { stock_remaining?: number | string | null } | null)?.stock_remaining;
  return stock == null ? null : Number(stock);
}

export async function pushProfile(patch: { name?: string; age?: number | null; reasons?: string[] }): Promise<void> {
  const ctx = await context();
  if (!ctx) return;
  const next: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.name === "string" && patch.name.trim()) next.name = patch.name.trim();
  if (patch.age != null && patch.age > 0 && patch.age < 130) next.age = patch.age;
  if (patch.reasons) next.usage_reasons = patch.reasons;
  const { error } = await ctx.db.from("users").update(next).eq("id", ctx.userId);
  if (error) console.error("profile save failed", error.message);
}

export async function pushInvite(code: string | null): Promise<void> {
  const ctx = await context();
  if (!ctx || !isUuid(ctx.authId)) return;
  if (!code) {
    const { error } = await ctx.db
      .from("caregiver_links")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("patient_id", ctx.userId)
      .eq("status", "pending");
    if (error) console.error("invite revoke failed", error.message);
    return;
  }
  const { data: existing } = await ctx.db.from("caregiver_links").select("id").eq("patient_id", ctx.userId).eq("invite_code", code).maybeSingle();
  if (existing) {
    await ctx.db.from("caregiver_links").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", (existing as { id: string }).id);
    return;
  }
  const { error } = await ctx.db.from("caregiver_links").insert({
    patient_id: ctx.userId,
    patient_auth_id: ctx.authId,
    invite_code: code,
    status: "pending",
    permissions: permsToDb({ seeDoses: true, markDoses: true, editMedicines: true, seeHistory: true }),
  });
  if (error) console.error("invite save failed", error.message);
}

export async function pushJoin(code: string): Promise<"ok" | "bad" | "local"> {
  const ctx = await context();
  if (!ctx) return "local";
  const { data, error } = await ctx.db.rpc("accept_caregiver_invite", { p_code: code, p_caregiver_user_id: ctx.userId });
  if (error || !data) {
    if (error) console.error("join failed", error.message);
    return "bad";
  }
  return "ok";
}

export async function pushPermission(linkId: string, perms: Permissions): Promise<void> {
  const ctx = await context();
  if (!ctx || !isUuid(linkId)) return;
  const { error } = await ctx.db.from("caregiver_links").update({ permissions: permsToDb(perms), updated_at: new Date().toISOString() }).eq("id", linkId);
  if (error) console.error("permission save failed", error.message);
}

export async function pushLeave(linkId: string): Promise<void> {
  const ctx = await context();
  if (!ctx || !isUuid(linkId)) return;
  const { error } = await ctx.db.rpc("caregiver_leave_link", { p_link_id: linkId });
  if (error) console.error("leave link failed", error.message);
}
