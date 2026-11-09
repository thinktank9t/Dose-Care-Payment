"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { signInWithGoogle } from "@/lib/actions/auth";
import { GoogleMark } from "@/components/GoogleMark";
import { formatClock, scheduledDoses, todayKey } from "@/lib/care/schedule";
import { localizeDigits } from "@/lib/format";
import type { Permissions } from "@/lib/care/types";
import { DoseFlag, EmptyState, Icon, MedGlyph, ScreenHeader, Segmented, Sheet, Toggle } from "./chrome";
import { useCare } from "./store";

export function CareScreen() {
  const t = useTranslations("care");
  const locale = useLocale() as Locale;
  const { profile, setInvite, cancelRequest } = useCare();
  const [tab, setTab] = useState<"helping" | "care">("helping");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [undo, setUndo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function requireAccount(then: () => void) {
    if (!profile.signedIn) {
      setSignOpen(true);
      return;
    }
    then();
  }

  function openInvite() {
    requireAccount(() => {
      if (!profile.inviteCode) {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        setInvite(Array.from(bytes, (value) => alphabet[value % alphabet.length]).join(""));
      }
      setInviteOpen(true);
    });
  }

  return (
    <div className="container-page py-8 lg:py-10">
      <h1>{t("carePage.title")}</h1>
      <div className="mt-6 max-w-md">
        <Segmented
          label={t("carePage.title")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "helping", label: t("carePage.helping") },
            { value: "care", label: t("carePage.iCare") },
          ]}
        />
      </div>

      {tab === "helping" ? (
        <>
          <button type="button" className="card mt-4 flex w-full items-center gap-3 p-4 text-left" onClick={openInvite}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"><Icon name="plus" size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-accent-ink">{t("carePage.invite")}</span>
              <span className="block text-small text-ink-2">{t("carePage.inviteHint")}</span>
            </span>
            <Icon name="chevron" size={18} />
          </button>
          <EmptyState icon={<Icon name="users" size={40} />} title={t("carePage.emptyHelpTitle")} body={t("carePage.emptyHelpBody")} />
        </>
      ) : (
        <>
          <Link href="/care/join" className="card mt-4 flex items-center gap-3 p-4" onClick={(event) => { if (!profile.signedIn) { event.preventDefault(); setSignOpen(true); } }}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent-ink"><Icon name="plus" size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t("carePage.join")}</span>
              <span className="block text-small text-ink-2">{t("carePage.joinHint")}</span>
            </span>
            <Icon name="chevron" size={18} />
          </Link>
          {profile.people.length === 0 ? (
            <EmptyState icon={<Icon name="user" size={40} />} title={t("carePage.emptyCareTitle")} body={t("carePage.emptyCareBody")} />
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {profile.people.map((person) => (
                <li key={person.id} className="card flex items-center gap-3 p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft font-heading text-accent-ink">{person.name.slice(0, 1)}</span>
                  <Link href={person.pending ? "/care" : `/care/${person.id}`} className="min-w-0 flex-1">
                    <span className="block font-medium">{person.name}</span>
                    <span className="text-small text-ink-2">{person.pending ? t("carePage.pending") : localizeDigits(t("carePage.medicinesCount", { count: person.medicines.length }), locale)}</span>
                  </Link>
                  {person.pending ? (
                    <button type="button" className="text-small font-medium text-warn" onClick={() => cancelRequest(person.id)}>{t("carePage.cancelRequest")}</button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {inviteOpen && profile.inviteCode ? (
        <Sheet title={t("carePage.codeTitle")} onClose={() => setInviteOpen(false)}>
          <p className="text-center font-mono text-[28px] tracking-[0.18em] text-ink">{profile.inviteCode}</p>
          <p className="mt-2 text-center text-small text-ink-2">{t("carePage.inviteHint")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-secondary" onClick={async () => { await navigator.clipboard.writeText(profile.inviteCode || ""); setCopied(true); }}>{copied ? t("carePage.copied") : t("carePage.copy")}</button>
            <button type="button" className="btn btn-secondary" onClick={() => { if (navigator.share) void navigator.share({ text: profile.inviteCode || "" }); else void navigator.clipboard.writeText(profile.inviteCode || ""); }}>{t("carePage.share")}</button>
          </div>
          <button type="button" className="btn btn-danger mt-3 w-full" onClick={() => setRevokeOpen(true)}>{t("carePage.revoke")}</button>
        </Sheet>
      ) : null}
      {revokeOpen ? (
        <Sheet title={t("carePage.revokeTitle")} onClose={() => setRevokeOpen(false)}>
          <p className="text-ink-2">{t("carePage.revokeBody")}</p>
          <button type="button" className="btn btn-danger mt-4 w-full" onClick={() => {
            const previous = profile.inviteCode;
            setInvite(null);
            setRevokeOpen(false);
            setInviteOpen(false);
            if (previous) {
              setUndo(previous);
              window.setTimeout(() => setUndo(null), 5000);
            }
          }}>{t("carePage.revoke")}</button>
        </Sheet>
      ) : null}
      {signOpen ? <SignInSheet onClose={() => setSignOpen(false)} /> : null}
      {undo ? (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <div className="flex w-full max-w-[440px] items-center justify-between rounded-2xl bg-ink px-4 py-3 text-bg">
            <span>{t("carePage.revoked")}</span>
            <button type="button" className="font-medium" onClick={() => { setInvite(undo); setUndo(null); }}>{t("carePage.undo")}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SignInSheet({ onClose }: { onClose: () => void }) {
  const t = useTranslations("care");
  return (
    <Sheet title={t("carePage.signTitle")} onClose={onClose}>
      <p className="text-ink-2">{t("carePage.signBody")}</p>
      <form action={signInWithGoogle} className="mt-4">
        <input type="hidden" name="next" value="/care" />
        <button type="submit" className="btn btn-primary w-full"><GoogleMark />{t("signIn.google")}</button>
      </form>
    </Sheet>
  );
}

export function JoinScreen() {
  const t = useTranslations("care");
  const router = useRouter();
  const { profile, join } = useCare();
  const [code, setCode] = useState("");
  const [error, setError] = useState<"own" | "bad" | null>(null);
  const [signOpen, setSignOpen] = useState(false);

  function send() {
    if (!profile.signedIn) {
      setSignOpen(true);
      return;
    }
    const result = join(code);
    if (result === "ok") router.push("/care");
    else setError(result);
  }

  return (
    <div className="container-page py-8">
    <div className="mx-auto max-w-xl">
      <ScreenHeader title={t("carePage.join")} onBack={() => router.push("/care")} />
      <label className="mt-6 block text-small text-ink-2" htmlFor="code">{t("carePage.code")}</label>
      <input id="code" className="field mt-2 w-full text-center font-mono text-[22px] tracking-[0.2em] uppercase" maxLength={6} value={code} placeholder={t("carePage.codePh")} onChange={(event) => setCode(event.target.value.toUpperCase())} />
      {error ? <p className="mt-2 text-small text-warn">{error === "own" ? t("carePage.ownCode") : t("carePage.badCode")}</p> : null}
      <button type="button" className="btn btn-primary mt-6 w-full" disabled={code.trim().length < 6} onClick={send}>{t("carePage.send")}</button>
      {signOpen ? <SignInSheet onClose={() => setSignOpen(false)} /> : null}
    </div>
    </div>
  );
}

export function PersonScreen({ personId }: { personId: string }) {
  const t = useTranslations("care");
  const locale = useLocale();
  const router = useRouter();
  const { ready, profile, markDose, stopCaring } = useCare();
  const person = profile.people.find((item) => item.id === personId);
  const [tab, setTab] = useState<"today" | "meds">("today");
  const [menu, setMenu] = useState(false);
  const [perms, setPerms] = useState(false);
  const [stop, setStop] = useState(false);
  const [medMenu, setMedMenu] = useState<string | null>(null);
  if (!ready) return <div className="min-h-svh" />;
  if (!person) return <p className="px-5 py-10 text-ink-2">{t("carePage.missing")}</p>;
  if (person.pending) {
    return (
      <div className="container-page py-8">
        <ScreenHeader title={person.name} onBack={() => router.push("/care")} />
        <p className="mt-6 text-ink-2">{t("carePage.waiting")}</p>
      </div>
    );
  }
  const today = todayKey();
  const doses = scheduledDoses(person.medicines, profile.personLogs[person.id] ?? [], today);

  return (
    <div className="container-page py-8 lg:py-10">
      <ScreenHeader
        title={person.name}
        onBack={() => router.push("/care")}
        action={<button type="button" aria-label={t("carePage.options")} className="min-h-11 px-2 text-[20px]" onClick={() => setMenu(true)}>⋯</button>}
      />
      <div className="mt-3">
        <Segmented label={person.name} value={tab} onChange={setTab} options={[{ value: "today", label: t("carePage.today") }, { value: "meds", label: t("carePage.medicines") }]} />
      </div>
      {tab === "today" ? (
        <ul className="mt-4 space-y-2">
          {doses.length === 0 ? <li className="text-ink-2">{t("today.emptyTitle")}</li> : doses.map((dose) => (
            <li key={`${dose.medicine.id}-${dose.time}`} className="card flex items-center gap-3 p-3">
              <MedGlyph form={dose.medicine.form} color={dose.medicine.color} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{dose.medicine.name}</span>
                <span className="text-small text-ink-2">{formatClock(dose.time, locale)}</span>
              </span>
              {person.permissions.markDoses && dose.status !== "taken" ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => markDose({ medicineId: dose.medicine.id, date: dose.date, time: dose.time, status: "taken", personId: person.id })}>{t("today.took")}</button>
              ) : dose.status === "taken" ? <Icon name="check" size={18} /> : <DoseFlag dose={dose} />}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          {person.permissions.editMedicines ? <Link href={`/care/${person.id}/add`} className="btn btn-secondary w-full">{t("carePage.addMed")}</Link> : null}
          <ul className="mt-3 space-y-2">
            {person.medicines.map((med) => (
              <li key={med.id} className="card flex items-center gap-3 p-3">
                <Link href={`/care/${person.id}/med/${med.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <MedGlyph form={med.form} color={med.color} />
                  <span className="font-medium">{med.name}</span>
                </Link>
                <button type="button" aria-label={t("carePage.options")} onClick={() => setMedMenu(med.id)}>⋯</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {menu ? (
        <Sheet title={person.name} onClose={() => setMenu(false)}>
          <button type="button" className="btn btn-secondary w-full" onClick={() => { setMenu(false); setPerms(true); }}>{t("carePage.perms")}</button>
          <button type="button" className="btn btn-danger mt-2 w-full" onClick={() => { setMenu(false); setStop(true); }}>{t("carePage.stop")}</button>
        </Sheet>
      ) : null}
      {perms ? <PermissionsSheet personId={person.id} onClose={() => setPerms(false)} /> : null}
      {stop ? (
        <Sheet title={t("carePage.stopTitle")} onClose={() => setStop(false)}>
          <p className="text-ink-2">{t("carePage.stopBody", { name: person.name })}</p>
          <button type="button" className="btn btn-danger mt-4 w-full" onClick={() => { stopCaring(person.id); router.push("/care"); }}>{t("carePage.stop")}</button>
        </Sheet>
      ) : null}
      {medMenu ? (
        <Sheet onClose={() => setMedMenu(null)}>
          <Link href={`/care/${person.id}/edit/${medMenu}`} className="btn btn-secondary w-full">{t("meds.edit")}</Link>
          <Link href={`/care/${person.id}/med/${medMenu}`} className="btn btn-secondary mt-2 w-full">{t("carePage.today")}</Link>
        </Sheet>
      ) : null}
    </div>
  );
}

function PermissionsSheet({ personId, onClose }: { personId: string; onClose: () => void }) {
  const t = useTranslations("care");
  const { profile, setPermission } = useCare();
  const person = profile.people.find((item) => item.id === personId);
  if (!person) return null;
  const rows: (keyof Permissions)[] = ["seeDoses", "markDoses", "editMedicines", "seeHistory"];
  return (
    <Sheet title={t("carePage.perms")} onClose={onClose}>
      <ul className="space-y-3">
        {rows.map((key) => (
          <li key={key} className="flex items-center justify-between gap-3">
            <span>{t(`carePage.perm.${key}`)}</span>
            <Toggle on={person.permissions[key]} label={t(`carePage.perm.${key}`)} onChange={(value) => setPermission(person.id, key, value)} />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
