"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signInWithGoogle, signOut } from "@/lib/actions/auth";
import { GoogleMark } from "@/components/GoogleMark";
import { applyContrast, applyTextScale, applyTheme } from "@/lib/appearance";
import { locales, type Locale } from "@/i18n/routing";
import { rememberLocaleChoice } from "@/i18n/locale-choice";
import { TEXT_SCALES, THEME_CHOICES, type TextScale, type ThemeChoice } from "@/lib/theme";
import { Icon, Segmented, Sheet } from "./chrome";
import { useCare } from "./store";

export function ProfileScreen({
  theme,
  contrast,
  scale,
}: {
  theme: ThemeChoice;
  contrast: boolean;
  scale: TextScale;
}) {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const { profile, session, setName, setFullScreen } = useCare();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(profile.name);
  const [language, setLanguage] = useState(false);
  const [mode, setMode] = useState(theme);
  const [high, setHigh] = useState(contrast);
  const [size, setSize] = useState(scale);
  const initial = (profile.name.trim()[0] || "D").toUpperCase();

  return (
    <div className="px-4 pb-6 pt-5">
      <h1 className="text-[30px]">{t("profile.title")}</h1>
      <section className="card mt-4 flex items-center gap-3 p-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft font-heading text-[24px] text-accent-ink">{initial}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[18px] font-medium">{profile.name.trim() || t("today.friend")}</span>
          <span className="text-small text-ink-2">{profile.signedIn ? session?.email || t("profile.personal") : t("profile.guest")}</span>
        </span>
        <button type="button" className="rounded-full bg-accent-soft px-4 py-2 font-medium text-accent-ink" onClick={() => { setDraft(profile.name); setEdit(true); }}>{t("profile.edit")}</button>
      </section>

      <p className="label-micro mt-6">{t("profile.careTeam")}</p>
      <Link href="/care" className="card mt-2 flex min-h-14 items-center px-4 font-medium text-accent-ink">{t("profile.addCaregiver")}</Link>

      <p className="label-micro mt-6">{t("profile.prescriptions")}</p>
      <Link href="/prescriptions" className="card mt-2 flex min-h-14 items-center justify-between px-4">
        <span className="inline-flex items-center gap-3"><Icon name="star" size={18} />{t("profile.myPrescriptions")}</span>
        <Icon name="chevron" size={18} />
      </Link>

      <p className="label-micro mt-6">{t("profile.accessibility")}</p>
      <section className="card mt-2 divide-y divide-line p-4">
        <button type="button" className="flex min-h-14 w-full items-center justify-between text-left" onClick={() => setLanguage(true)}>
          <span className="inline-flex items-center gap-3"><Icon name="users" size={18} />{t("profile.language")}</span>
          <span className="text-ink-2">{locale === "bn" ? t("setup.bangla") : t("setup.english")} <Icon name="chevron" size={16} /></span>
        </button>
        <div className="py-3">
          <p className="mb-2 inline-flex items-center gap-3"><Icon name="contrast" size={18} />{t("profile.textSize")}</p>
          <Segmented<TextScale>
            label={t("profile.textSize")}
            value={size}
            onChange={(next) => { setSize(next); applyTextScale(next); }}
            options={TEXT_SCALES.map((item) => ({ value: item, label: t(item === "1" ? "profile.normal" : item === "1.15" ? "profile.large" : "profile.extra") }))}
          />
        </div>
        <div className="py-3">
          <p className="mb-2 inline-flex items-center gap-3"><Icon name="sun" size={18} />{t("profile.appearance")}</p>
          <Segmented<ThemeChoice>
            label={t("profile.appearance")}
            value={mode}
            onChange={(next) => { setMode(next); applyTheme(next); }}
            options={THEME_CHOICES.map((item) => ({ value: item, label: t(`profile.theme.${item}`) }))}
          />
        </div>
        <div className="flex items-center justify-between gap-3 pt-3">
          <span>
            <span className="block">{t("profile.contrast")}</span>
            <span className="text-small text-ink-2">{t("profile.contrastHint")}</span>
          </span>
          <button type="button" role="switch" aria-checked={high} aria-label={t("profile.contrast")} onClick={() => { const next = !high; setHigh(next); applyContrast(next); }} className={`relative h-7 w-12 rounded-full border border-line ${high ? "bg-accent" : "bg-bg-alt"}`}>
            <span className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-surface ${high ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </section>

      <p className="label-micro mt-6">{t("profile.notifications")}</p>
      <section className="card mt-2 flex items-start justify-between gap-3 p-4">
        <div>
          <p className="font-medium">{t("profile.fullScreen")}</p>
          <p className="text-small text-ink-2">{t("profile.fullScreenBody")}</p>
        </div>
        <button type="button" role="switch" aria-checked={profile.fullScreenReminders} aria-label={t("profile.fullScreen")} onClick={() => setFullScreen(!profile.fullScreenReminders)} className={`relative mt-1 h-7 w-12 shrink-0 rounded-full border border-line ${profile.fullScreenReminders ? "bg-accent" : "bg-bg-alt"}`}>
          <span className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-surface ${profile.fullScreenReminders ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </section>
      <Link href="/reminder" className="mt-2 inline-flex min-h-11 items-center font-medium text-accent-ink">{t("profile.preview")}</Link>

      <p className="label-micro mt-6">{t("profile.account")}</p>
      {profile.signedIn ? (
        <form action={signOut} className="card mt-2 p-4">
          <p className="text-small text-ink-2">{t("profile.signedIn")}</p>
          <button type="submit" className="btn btn-secondary mt-3 w-full">{t("profile.signOut")}</button>
        </form>
      ) : (
        <form action={signInWithGoogle} className="card mt-2 p-4">
          <input type="hidden" name="next" value="/profile" />
          <button type="submit" className="flex min-h-14 w-full items-center gap-3 text-left">
            <GoogleMark />
            <span>
              <span className="block font-medium">{t("profile.signIn")}</span>
              <span className="text-small text-ink-2">{t("profile.signInHint")}</span>
            </span>
          </button>
        </form>
      )}

      {edit ? (
        <Sheet title={t("profile.edit")} onClose={() => setEdit(false)}>
          <label className="text-small text-ink-2" htmlFor="edit-name">{t("setup.nameLabel")}</label>
          <input id="edit-name" className="field mt-2 w-full" value={draft} onChange={(event) => setDraft(event.target.value)} />
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={!draft.trim()} onClick={() => { setName(draft.trim()); setEdit(false); }}>{t("profile.save")}</button>
        </Sheet>
      ) : null}
      {language ? (
        <Sheet title={t("profile.language")} onClose={() => setLanguage(false)}>
          <ul className="space-y-2">
            {locales.map((item) => (
              <li key={item}>
                <Link
                  href="/profile"
                  locale={item}
                  replace
                  data-testid={`lang-${item}`}
                  onClick={() => rememberLocaleChoice(item)}
                  className={`flex min-h-14 items-center rounded-[18px] border px-4 ${item === locale ? "border-accent bg-accent-soft text-accent-ink" : "border-line"}`}
                >
                  {item === "bn" ? t("setup.bangla") : t("setup.english")}
                </Link>
              </li>
            ))}
          </ul>
        </Sheet>
      ) : null}
    </div>
  );
}
