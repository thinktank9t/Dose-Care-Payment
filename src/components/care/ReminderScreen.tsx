"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatClock, isPast, scheduledDoses, todayKey } from "@/lib/care/schedule";
import { formatNumber } from "@/lib/format";
import type { ReminderStyle, ScheduledDose } from "@/lib/care/types";
import { Icon, MedGlyph, Sheet } from "./chrome";
import { useCare } from "./store";

export function ReminderScreen({ medId, time }: { medId?: string; time?: string }) {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { profile, markDose, setReminderStyle } = useCare();
  const [styleOpen, setStyleOpen] = useState(false);
  const today = todayKey();
  const doses = scheduledDoses(profile.medicines, profile.logs, today).filter(
    (dose) => dose.status !== "taken" && dose.status !== "skipped",
  );
  const match = doses.find((dose) => dose.medicine.id === medId && (!time || dose.time === time));
  const due = match || doses.find((dose) => isPast(today, dose.time)) || doses[0];

  function act(dose: ScheduledDose, status: "taken" | "skipped" | "snoozed", minutes = 10) {
    markDose({ medicineId: dose.medicine.id, date: dose.date, time: dose.time, status, snoozeMinutes: minutes });
    router.push("/");
  }

  if (!due) {
    return (
      <div className="container-page flex min-h-[calc(100svh-4rem)] items-center py-10">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-3xl bg-accent px-8 py-12 text-center text-on-accent">
        <h1 className="text-[28px]">{t("reminder.noneTitle")}</h1>
        <p className="mt-2 opacity-80">{t("reminder.noneBody")}</p>
        <button type="button" className="btn mt-8 bg-surface text-accent-ink" onClick={() => router.push("/")}>{t("reminder.close")}</button>
      </div>
      </div>
    );
  }

  const loud = profile.reminderStyle === "persistent" || due.medicine.extraLoud;

  return (
    <div className="container-page flex min-h-[calc(100svh-4rem)] items-center py-10">
    <div className={`mx-auto flex w-full max-w-lg flex-col rounded-3xl px-6 py-8 text-on-accent sm:px-8 ${loud ? "bg-[#06324A]" : "bg-accent"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-small">
          <Icon name="bell" size={16} /> {t("reminder.kicker")}
        </p>
        <div className="flex gap-2">
          <button type="button" aria-label={t("reminder.style")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15" onClick={() => setStyleOpen(true)}>
            <Icon name="gear" size={18} />
          </button>
          <button type="button" aria-label={t("reminder.close")} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15" onClick={() => router.push("/")}>
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>
      <div className="flex flex-col items-center py-8 text-center">
        <span className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/15">
          <MedGlyph form={due.medicine.form} color={due.medicine.color} size={72} />
        </span>
        <p className="text-[18px] tracking-wide">{formatClock(due.time, locale)}</p>
        <h1 className="mt-1 text-[40px]">{due.medicine.name}</h1>
        <p className="mt-2 opacity-90">{t("reminder.body")}</p>
      </div>
      <button type="button" className="btn w-full bg-surface text-accent-ink" onClick={() => act(due, "taken")}>
        <Icon name="check" size={18} /> {t("reminder.took")}
      </button>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[5, 10, 15].map((minutes) => (
          <button key={minutes} type="button" className="min-h-12 rounded-full bg-white/15" onClick={() => act(due, "snoozed", minutes)}>
            {t("reminder.min", { count: formatNumber(minutes, locale) })}
          </button>
        ))}
      </div>
      <button type="button" className="mt-3 min-h-12 rounded-full border border-white/30" onClick={() => act(due, "skipped")}>{t("reminder.skip")}</button>
    </div>
      {styleOpen ? (
        <Sheet title={t("reminder.style")} onClose={() => setStyleOpen(false)}>
          <ul className="space-y-2">
            {(["gentle", "standard", "persistent"] as ReminderStyle[]).map((style) => (
              <li key={style}>
                <button type="button" className={`w-full rounded-xl px-3 py-3 text-left ${profile.reminderStyle === style ? "bg-accent-soft text-accent-ink" : ""}`} onClick={() => { setReminderStyle(style); setStyleOpen(false); }}>
                  <span className="block font-medium">{t(`reminder.${style}`)}</span>
                  <span className="text-small text-ink-2">{t(`reminder.${style}Hint`)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      ) : null}
    </div>
  );
}
