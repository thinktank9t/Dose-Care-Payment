"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { signInWithGoogle } from "@/lib/actions/auth";
import { GoogleMark } from "@/components/GoogleMark";
import type { Locale } from "@/i18n/routing";
import { formatNumber } from "@/lib/format";
import { Icon } from "./chrome";
import { useCare } from "./store";

const REASONS = ["myself", "parent", "child", "caregiver", "clinician"] as const;

export function Onboarding() {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { profile, session, setPhase, setName, setAge, toggleReason, finishSetup } = useCare();
  const [ageDraft, setAgeDraft] = useState(profile.age === null ? "" : String(profile.age));
  // Signed in already (the site requires it), so the sign-in card would be a dead step.
  const afterSlides = session ? "name" : "signin";

  if (profile.phase === "signin" && !session) {
    return (
      <div className="container-page flex min-h-[calc(100svh-4rem)] items-center py-10">
      <section className="card mx-auto w-full max-w-xl p-6 sm:p-10" data-testid="onboarding">
        <div className="flex flex-col items-center py-6 text-center">
          <span className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_12px_30px_rgba(11,85,117,0.25)]">
            <Icon name="capsule" size={40} strokeWidth={1.8} />
          </span>
          <h1 className="max-w-[12ch] text-[34px]">{t("signIn.title")}</h1>
          <p className="mt-3 max-w-[28ch] text-ink-2">{t("signIn.body")}</p>
        </div>
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value="/" />
          <button type="submit" className="btn btn-primary w-full" data-testid="google-sign-in">
            <GoogleMark />
            {t("signIn.google")}
          </button>
        </form>
        <p className="mt-5 text-center text-small text-ink-2">
          {t.rich("signIn.legal", {
            terms: (chunks) => <Link href="/terms" className="underline">{chunks}</Link>,
            privacy: (chunks) => <Link href="/privacy" className="underline">{chunks}</Link>,
          })}
        </p>
      </section>
      </div>
    );
  }

  // Older saved progress may sit on the removed language step, or on the
  // sign-in step from before the user signed in.
  const phase =
    profile.phase === "language" ? "why" : profile.phase === "signin" && session ? "name" : profile.phase;
  if (phase === "name" || phase === "age" || phase === "why") {
    const step = phase === "name" ? 1 : phase === "age" ? 2 : 3;
    const ageNumber = Number(ageDraft);
    const ageValid = /^\d{1,3}$/.test(ageDraft.trim()) && ageNumber >= 1 && ageNumber <= 120;
    const canNext =
      (phase === "name" && profile.name.trim().length > 0) ||
      (phase === "age" && ageValid) ||
      (phase === "why" && profile.reasons.length > 0);
    function next() {
      if (phase === "name") setPhase("age");
      else if (phase === "age") {
        setAge(ageNumber);
        setPhase("why");
      } else {
        finishSetup();
        // Land somewhere useful: an empty Today screen is a dead end.
        if (profile.medicines.length === 0) router.push("/medicines/new");
      }
    }
    function back() {
      if (phase === "age") setPhase("name");
      else if (phase === "why") setPhase("age");
      else if (session) setPhase("slides", 2);
      else setPhase("signin");
    }
    return (
      <div className="container-page flex min-h-[calc(100svh-4rem)] items-center py-10">
      <section className="card mx-auto flex w-full max-w-xl flex-col p-6 sm:p-10" data-testid="onboarding">
        <div className="mb-5 flex items-center gap-3">
          <button type="button" onClick={back} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface" aria-label={t("common.back")}>
            <Icon name="back" />
          </button>
          <div className="flex-1">
            <p className="label-micro">{t("setup.step", { step: formatNumber(step, locale) })}</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map((n) => (
                <span key={n} className={`h-1 rounded-full ${n <= step ? "bg-accent" : "bg-line"}`} />
              ))}
            </div>
          </div>
        </div>
        <form
          className="flex flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (canNext) next();
          }}
        >
          {phase === "name" && (
            <>
              <h1 className="text-[30px]">{t("setup.nameTitle")}</h1>
              <label className="mt-6 text-small text-ink-2" htmlFor="setup-name">{t("setup.nameLabel")}</label>
              <input id="setup-name" className="field mt-2 w-full" autoComplete="given-name" value={profile.name} placeholder={t("setup.namePlaceholder")} onChange={(event) => setName(event.target.value)} />
            </>
          )}
          {phase === "age" && (
            <>
              <h1 className="text-[30px]">{t("setup.ageTitle")}</h1>
              <p className="mt-2 text-ink-2">{t("setup.ageHint")}</p>
              <label className="mt-6 text-small text-ink-2" htmlFor="setup-age">{t("setup.ageLabel")}</label>
              <input
                id="setup-age"
                className="field mt-2 w-full max-w-[10rem] text-[20px]"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                autoComplete="off"
                value={ageDraft}
                placeholder="65"
                onChange={(event) => setAgeDraft(event.target.value.replace(/[^\d]/g, ""))}
                data-testid="setup-age"
              />
            </>
          )}
          {phase === "why" && (
            <>
              <h1 className="text-[30px]">{t("setup.whyTitle")}</h1>
              <p className="mt-2 text-ink-2">{t("setup.whyHint")}</p>
              <ul className="mt-5 space-y-2">
                {REASONS.map((reason) => {
                  const on = profile.reasons.includes(reason);
                  return (
                    <li key={reason}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleReason(reason)}
                        className={`flex min-h-14 w-full items-center justify-between rounded-[18px] border px-4 text-left ${on ? "border-accent bg-accent-soft text-accent-ink" : "border-line bg-surface"}`}
                      >
                        {t(`setup.reason.${reason}`)}
                        {on ? <Icon name="check" size={18} /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <div className="mt-auto pt-8">
            <button type="submit" className="btn btn-primary w-full" disabled={!canNext} data-testid="onboarding-continue">
              {phase === "why" ? t("setup.finish") : t("setup.next")}
            </button>
          </div>
        </form>
      </section>
      </div>
    );
  }

  const slides = [
    { kicker: t("onboard.welcomeKicker"), title: t("onboard.welcomeTitle"), body: t("onboard.welcomeBody"), icon: "pill" as const, tint: "bg-accent-soft text-accent" },
    { kicker: t("onboard.remindKicker"), title: t("onboard.remindTitle"), body: t("onboard.remindBody"), icon: "clock" as const, tint: "bg-warn-soft text-warn" },
    { kicker: t("onboard.careKicker"), title: t("onboard.careTitle"), body: t("onboard.careBody"), icon: "hearts" as const, tint: "bg-accent-soft text-accent" },
  ];
  const slide = slides[profile.slide] ?? slides[0];
  return (
    <div className="container-page flex min-h-[calc(100svh-4rem)] items-center py-10">
    <section className="card mx-auto flex w-full max-w-xl flex-col p-6 sm:p-10" data-testid="onboarding">
      <div className="flex items-center justify-between">
        {profile.slide === 0 ? (
          <p className="font-heading text-[20px]">Dose Care</p>
        ) : (
          <button type="button" className="flex h-11 w-11 items-center justify-center" aria-label={t("common.back")} onClick={() => setPhase("slides", profile.slide - 1)}>
            <Icon name="back" />
          </button>
        )}
        <button type="button" className="min-h-11 px-2 text-[15px] text-ink-2" onClick={() => setPhase(afterSlides)} data-testid="onboarding-skip">
          {t("onboard.skip")}
        </button>
      </div>
      <div className="flex flex-col items-center py-8 text-center">
        <span className={`mb-8 flex h-36 w-36 items-center justify-center rounded-full ${slide.tint}`}>
          <Icon name={slide.icon} size={52} />
        </span>
        <p className="label-micro text-accent-ink">{slide.kicker}</p>
        <h1 className="mt-3 max-w-[14ch] text-[34px]">{slide.title}</h1>
        <p className="mt-3 max-w-[34ch] text-ink-2">{slide.body}</p>
      </div>
      <div className="mb-4 flex items-center justify-center gap-1.5" aria-hidden>
        {slides.map((_, index) => (
          <span key={index} className={`h-1.5 rounded-full ${index === profile.slide ? "w-6 bg-accent" : "w-1.5 bg-line"}`} />
        ))}
      </div>
      <p className="mb-3 text-center text-small text-ink-2">{t("onboard.step", { step: profile.slide + 1 })}</p>
      {profile.slide < 2 ? (
        <button type="button" className="btn btn-primary w-full" onClick={() => setPhase("slides", profile.slide + 1)} data-testid="onboarding-continue">
          {t("onboard.continue")}
        </button>
      ) : (
        <>
          <button type="button" className="btn btn-primary w-full" onClick={() => setPhase(afterSlides)} data-testid="onboarding-continue">
            {t("onboard.getStarted")}
          </button>
          {session ? null : (
            <button type="button" className="mt-3 min-h-12 text-[15px] font-medium text-ink-2" onClick={() => setPhase("signin")}>
              {t("onboard.haveAccount")}
            </button>
          )}
        </>
      )}
    </section>
    </div>
  );
}
