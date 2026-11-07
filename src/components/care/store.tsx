"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { sampleCircle } from "@/lib/care/schedule";
import type {
  DoseLog,
  Medicine,
  Permissions,
  Prescription,
  Profile,
  ReminderStyle,
  SetupPhase,
} from "@/lib/care/types";

const KEY = "dosecare.care.v1";

export type SessionInfo = { name: string; email: string | null };

function emptyProfile(): Profile {
  return {
    onboarded: false,
    phase: "slides",
    slide: 0,
    name: "",
    age: null,
    reasons: [],
    signedIn: false,
    careSeeded: false,
    inviteCode: null,
    fullScreenReminders: false,
    reminderStyle: "standard",
    medicines: [],
    logs: [],
    people: [],
    personLogs: {},
    prescriptions: [],
  };
}

function hydrate(raw: unknown): Profile {
  const base = emptyProfile();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<Profile>;
  return {
    ...base,
    ...value,
    reasons: Array.isArray(value.reasons) ? value.reasons : [],
    medicines: Array.isArray(value.medicines) ? value.medicines : [],
    logs: Array.isArray(value.logs) ? value.logs : [],
    people: Array.isArray(value.people) ? value.people : [],
    personLogs: value.personLogs && typeof value.personLogs === "object" ? value.personLogs : {},
    prescriptions: Array.isArray(value.prescriptions) ? value.prescriptions : [],
  };
}

function upsertLog(logs: DoseLog[], entry: DoseLog): DoseLog[] {
  return [
    ...logs.filter(
      (log) => !(log.medicineId === entry.medicineId && log.date === entry.date && log.time === entry.time),
    ),
    entry,
  ];
}

function withStock(meds: Medicine[], id: string, previous: DoseLog["status"] | "due", next: DoseLog["status"] | "due") {
  return meds.map((med) => {
    if (med.id !== id || !med.trackSupply) return med;
    let stock = med.stock;
    if (previous !== "taken" && next === "taken") stock = Math.max(0, stock - Math.max(1, med.amount));
    if (previous === "taken" && next !== "taken") stock += Math.max(1, med.amount);
    return { ...med, stock };
  });
}

type MarkArgs = {
  medicineId: string;
  date: string;
  time: string;
  status: DoseLog["status"];
  snoozeMinutes?: number;
  personId?: string;
};

type CareApi = {
  ready: boolean;
  profile: Profile;
  session: SessionInfo | null;
  setPhase: (phase: SetupPhase, slide?: number) => void;
  setName: (name: string) => void;
  setAge: (age: number) => void;
  toggleReason: (id: string) => void;
  finishSetup: () => void;
  saveMedicine: (med: Medicine, personId?: string) => void;
  deleteMedicine: (id: string, personId?: string) => void;
  setPaused: (id: string, paused: boolean, personId?: string) => void;
  markDose: (args: MarkArgs) => void;
  refill: (id: string, add: number, personId?: string) => void;
  setSupply: (id: string, patch: Partial<Pick<Medicine, "stock" | "packSize" | "refillAt" | "trackSupply">>, personId?: string) => void;
  setInvite: (code: string | null) => void;
  join: (code: string) => "ok" | "own" | "bad";
  cancelRequest: (personId: string) => void;
  stopCaring: (personId: string) => void;
  setPermission: (personId: string, key: keyof Permissions, value: boolean) => void;
  setReminderStyle: (style: ReminderStyle) => void;
  setFullScreen: (on: boolean) => void;
  addPrescription: (rx: Prescription) => void;
  renamePrescription: (id: string, name: string) => void;
  deletePrescription: (id: string) => void;
};

const CareContext = createContext<CareApi | null>(null);

export function CareProvider({
  session,
  children,
}: {
  session: SessionInfo | null;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setProfile(hydrate(JSON.parse(raw)));
    } catch {
      setProfile(emptyProfile());
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(KEY, JSON.stringify(profile));
  }, [profile, ready]);

  useEffect(() => {
    if (!ready) return;
    setProfile((current) => {
      const signedIn = Boolean(session);
      if (!signedIn) return current.signedIn ? { ...current, signedIn: false } : current;
      if (current.signedIn && current.careSeeded) {
        return current.name ? current : { ...current, name: session?.name || current.name };
      }
      return {
        ...current,
        signedIn: true,
        name: current.name || session?.name || "",
        careSeeded: true,
        people: current.people.length > 0 ? current.people : sampleCircle(),
      };
    });
  }, [ready, session]);

  const update = useCallback((fn: (profile: Profile) => Profile) => {
    setProfile(fn);
  }, []);

  const api = useMemo<CareApi>(() => {
    const patchList = (current: Profile, personId: string | undefined, map: (meds: Medicine[]) => Medicine[]) => {
      if (!personId) return { ...current, medicines: map(current.medicines) };
      return {
        ...current,
        people: current.people.map((person) =>
          person.id === personId ? { ...person, medicines: map(person.medicines) } : person,
        ),
      };
    };

    return {
      ready,
      profile,
      session,
      setPhase: (phase, slide) => update((current) => ({ ...current, phase, slide: slide ?? current.slide })),
      setName: (name) => update((current) => ({ ...current, name })),
      setAge: (age) => update((current) => ({ ...current, age })),
      toggleReason: (id) =>
        update((current) => ({
          ...current,
          reasons: current.reasons.includes(id)
            ? current.reasons.filter((reason) => reason !== id)
            : [...current.reasons, id],
        })),
      finishSetup: () => update((current) => ({ ...current, onboarded: true, phase: "done" })),
      saveMedicine: (med, personId) =>
        update((current) =>
          patchList(current, personId, (meds) => {
            const index = meds.findIndex((item) => item.id === med.id);
            if (index === -1) return [...meds, med];
            return meds.map((item) => (item.id === med.id ? med : item));
          }),
        ),
      deleteMedicine: (id, personId) =>
        update((current) => patchList(current, personId, (meds) => meds.filter((med) => med.id !== id))),
      setPaused: (id, paused, personId) =>
        update((current) =>
          patchList(current, personId, (meds) => meds.map((med) => (med.id === id ? { ...med, paused } : med))),
        ),
      markDose: ({ medicineId, date, time, status, snoozeMinutes = 10, personId }) =>
        update((current) => {
          const logs = personId ? current.personLogs[personId] ?? [] : current.logs;
          const previous = logs.find(
            (log) => log.medicineId === medicineId && log.date === date && log.time === time,
          )?.status ?? "due";
          const entry: DoseLog = {
            medicineId,
            date,
            time,
            status,
            snoozeUntil:
              status === "snoozed" ? new Date(Date.now() + snoozeMinutes * 60_000).toISOString() : undefined,
          };
          const nextLogs = upsertLog(logs, entry);
          if (personId) {
            return {
              ...patchList(current, personId, (meds) => withStock(meds, medicineId, previous, status)),
              personLogs: { ...current.personLogs, [personId]: nextLogs },
            };
          }
          return {
            ...current,
            logs: nextLogs,
            medicines: withStock(current.medicines, medicineId, previous, status),
          };
        }),
      refill: (id, add, personId) =>
        update((current) =>
          patchList(current, personId, (meds) =>
            meds.map((med) => (med.id === id ? { ...med, stock: Math.max(0, med.stock + add) } : med)),
          ),
        ),
      setSupply: (id, patch, personId) =>
        update((current) =>
          patchList(current, personId, (meds) => meds.map((med) => (med.id === id ? { ...med, ...patch } : med))),
        ),
      setInvite: (code) => update((current) => ({ ...current, inviteCode: code })),
      join: (code) => {
        const trimmed = code.trim().toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(trimmed)) return "bad";
        if (profile.inviteCode && profile.inviteCode === trimmed) return "own";
        update((current) => {
          if (current.people.some((person) => person.id === `join-${trimmed}`)) return current;
          return {
            ...current,
            people: [
              {
                id: `join-${trimmed}`,
                name: trimmed,
                pending: true,
                permissions: { seeDoses: true, markDoses: false, editMedicines: false, seeHistory: true },
                medicines: [],
              },
              ...current.people,
            ],
          };
        });
        return "ok";
      },
      cancelRequest: (personId) =>
        update((current) => ({ ...current, people: current.people.filter((person) => person.id !== personId) })),
      stopCaring: (personId) =>
        update((current) => {
          const { [personId]: _removed, ...personLogs } = current.personLogs;
          return { ...current, people: current.people.filter((person) => person.id !== personId), personLogs };
        }),
      setPermission: (personId, key, value) =>
        update((current) => ({
          ...current,
          people: current.people.map((person) =>
            person.id === personId ? { ...person, permissions: { ...person.permissions, [key]: value } } : person,
          ),
        })),
      setReminderStyle: (style) => update((current) => ({ ...current, reminderStyle: style })),
      setFullScreen: (on) => update((current) => ({ ...current, fullScreenReminders: on })),
      addPrescription: (rx) => update((current) => ({ ...current, prescriptions: [rx, ...current.prescriptions] })),
      renamePrescription: (id, name) =>
        update((current) => ({
          ...current,
          prescriptions: current.prescriptions.map((rx) => (rx.id === id ? { ...rx, name } : rx)),
        })),
      deletePrescription: (id) =>
        update((current) => ({
          ...current,
          prescriptions: current.prescriptions.filter((rx) => rx.id !== id),
        })),
    };
  }, [profile, ready, session, update]);

  return <CareContext.Provider value={api}>{children}</CareContext.Provider>;
}

export function useCare(): CareApi {
  const value = useContext(CareContext);
  if (!value) throw new Error("useCare must be used inside CareProvider");
  return value;
}
