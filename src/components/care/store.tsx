"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  archiveMedicine,
  pullCare,
  pushDose,
  pushInvite,
  pushJoin,
  pushLeave,
  pushMedicine,
  pushPermission,
  pushProfile,
  type RemoteCare,
} from "@/lib/actions/care-sync";
import { isUuid } from "@/lib/care/db-map";
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

function logKey(log: DoseLog): string {
  return `${log.medicineId}|${log.date}|${log.time}`;
}

function mergeRemote(current: Profile, remote: RemoteCare, sessionName: string): Profile {
  const remoteIds = new Set(remote.medicines.map((med) => med.id));
  const localOnly = current.medicines.filter((med) => isUuid(med.id) && !remoteIds.has(med.id));
  for (const med of localOnly) void pushMedicine(med);
  const seen = new Set(remote.logs.map(logKey));
  const extraLogs = current.logs.filter((log) => isUuid(log.medicineId) && !seen.has(logKey(log)));
  for (const log of extraLogs) void pushDose(log);
  if (current.onboarded && current.name && current.name !== remote.name) {
    void pushProfile({ name: current.name, age: current.age, reasons: current.reasons });
  }
  return {
    ...current,
    signedIn: true,
    careSeeded: true,
    name: current.onboarded && current.name ? current.name : remote.name || current.name || sessionName,
    age: current.age ?? remote.age,
    reasons: current.reasons.length > 0 ? current.reasons : remote.reasons,
    medicines: [...remote.medicines, ...localOnly],
    logs: [...remote.logs, ...extraLogs],
    people: remote.people,
    inviteCode: remote.inviteCode,
    onboarded: current.onboarded || remote.medicines.length > 0 || remote.age != null || remote.reasons.length > 0,
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
    if (!session) {
      setProfile((current) => (current.signedIn ? { ...current, signedIn: false } : current));
      return;
    }
    let cancel = false;
    void pullCare()
      .then((remote) => {
        if (cancel) return;
        if (!remote) {
          setProfile((current) => {
            if (current.signedIn && current.careSeeded) {
              return current.name ? current : { ...current, name: session.name || current.name };
            }
            return {
              ...current,
              signedIn: true,
              name: current.name || session.name || "",
              careSeeded: true,
              people: current.people.length > 0 ? current.people : sampleCircle(),
            };
          });
          return;
        }
        setProfile((current) => mergeRemote(current, remote, session.name));
      })
      .catch((error) => {
        console.error(error);
      });
    return () => {
      cancel = true;
    };
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
      setName: (name) => {
        update((current) => ({ ...current, name }));
        void pushProfile({ name });
      },
      setAge: (age) => {
        update((current) => ({ ...current, age }));
        void pushProfile({ age });
      },
      toggleReason: (id) => {
        const reasons = profile.reasons.includes(id)
          ? profile.reasons.filter((reason) => reason !== id)
          : [...profile.reasons, id];
        update((current) => ({ ...current, reasons }));
        void pushProfile({ reasons });
      },
      finishSetup: () => {
        update((current) => ({ ...current, onboarded: true, phase: "done" }));
        void pushProfile({ name: profile.name, age: profile.age, reasons: profile.reasons });
      },
      saveMedicine: (med, personId) => {
        update((current) =>
          patchList(current, personId, (meds) => {
            const index = meds.findIndex((item) => item.id === med.id);
            if (index === -1) return [...meds, med];
            return meds.map((item) => (item.id === med.id ? med : item));
          }),
        );
        const owner = personId ? profile.people.find((person) => person.id === personId)?.userId : undefined;
        void pushMedicine(med, owner);
      },
      deleteMedicine: (id, personId) => {
        update((current) => patchList(current, personId, (meds) => meds.filter((med) => med.id !== id)));
        void archiveMedicine(id);
      },
      setPaused: (id, paused, personId) => {
        update((current) =>
          patchList(current, personId, (meds) => meds.map((med) => (med.id === id ? { ...med, paused } : med))),
        );
        const list = personId ? profile.people.find((person) => person.id === personId)?.medicines : profile.medicines;
        const med = list?.find((item) => item.id === id);
        const owner = personId ? profile.people.find((person) => person.id === personId)?.userId : undefined;
        if (med) void pushMedicine({ ...med, paused }, owner);
      },
      markDose: ({ medicineId, date, time, status, snoozeMinutes = 10, personId }) => {
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
        });
        const owner = personId ? profile.people.find((person) => person.id === personId)?.userId : undefined;
        void pushDose({ medicineId, date, time, status, snoozeMinutes }, owner).then((stock) => {
          if (stock == null || personId) return;
          setProfile((current) => ({
            ...current,
            medicines: current.medicines.map((med) => (med.id === medicineId && med.trackSupply ? { ...med, stock } : med)),
          }));
        });
      },
      refill: (id, add, personId) => {
        const list = personId ? profile.people.find((person) => person.id === personId)?.medicines : profile.medicines;
        const med = list?.find((item) => item.id === id);
        update((current) =>
          patchList(current, personId, (meds) =>
            meds.map((item) => (item.id === id ? { ...item, stock: Math.max(0, item.stock + add) } : item)),
          ),
        );
        if (med) {
          const owner = personId ? profile.people.find((person) => person.id === personId)?.userId : undefined;
          void pushMedicine({ ...med, stock: Math.max(0, med.stock + add) }, owner);
        }
      },
      setSupply: (id, patch, personId) => {
        const list = personId ? profile.people.find((person) => person.id === personId)?.medicines : profile.medicines;
        const med = list?.find((item) => item.id === id);
        update((current) =>
          patchList(current, personId, (meds) => meds.map((item) => (item.id === id ? { ...item, ...patch } : item))),
        );
        if (med) {
          const owner = personId ? profile.people.find((person) => person.id === personId)?.userId : undefined;
          void pushMedicine({ ...med, ...patch }, owner);
        }
      },
      setInvite: (code) => {
        update((current) => ({ ...current, inviteCode: code }));
        void pushInvite(code);
      },
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
        void pushJoin(trimmed).then(async (result) => {
          if (result === "local") return;
          if (result !== "ok") {
            setProfile((current) => ({ ...current, people: current.people.filter((person) => person.id !== `join-${trimmed}`) }));
            return;
          }
          const snapshot = await pullCare();
          if (snapshot) setProfile((current) => mergeRemote(current, snapshot, session?.name ?? ""));
        });
        return "ok";
      },
      cancelRequest: (personId) => {
        update((current) => ({ ...current, people: current.people.filter((person) => person.id !== personId) }));
        void pushLeave(personId);
      },
      stopCaring: (personId) => {
        update((current) => {
          const { [personId]: _removed, ...personLogs } = current.personLogs;
          return { ...current, people: current.people.filter((person) => person.id !== personId), personLogs };
        });
        void pushLeave(personId);
      },
      setPermission: (personId, key, value) => {
        const person = profile.people.find((item) => item.id === personId);
        update((current) => ({
          ...current,
          people: current.people.map((item) =>
            item.id === personId ? { ...item, permissions: { ...item.permissions, [key]: value } } : item,
          ),
        }));
        if (person) void pushPermission(personId, { ...person.permissions, [key]: value });
      },
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
