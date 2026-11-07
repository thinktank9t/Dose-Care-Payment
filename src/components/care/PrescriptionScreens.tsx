"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Prescription } from "@/lib/care/types";
import { EmptyState, Icon, ScreenHeader, Sheet } from "./chrome";
import { useCare } from "./store";

const MAX_BYTES = 1_500_000;

export function PrescriptionsScreen() {
  const t = useTranslations("care");
  const locale = useLocale();
  const router = useRouter();
  const { profile, addPrescription } = useCare();
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Prescription | null>(null);
  const [name, setName] = useState("");

  function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError(t("rx.tooBig"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setPending({
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ""),
        createdAt: new Date().toISOString(),
        kind: file.type === "application/pdf" ? "pdf" : "image",
        dataUrl,
      });
      setName(file.name.replace(/\.[^.]+$/, ""));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="container-page py-8 lg:py-10">
      <ScreenHeader title={t("rx.title")} onBack={() => router.push("/profile")} />
      <label className="btn btn-primary mt-4 w-full">
        {t("rx.scan")}
        <input className="sr-only" type="file" accept="image/*,.pdf" capture="environment" onChange={(event) => onFile(event.target.files?.[0])} />
      </label>
      {error ? <p className="mt-2 text-small text-warn">{error}</p> : null}
      {profile.prescriptions.length === 0 ? (
        <EmptyState icon={<Icon name="star" size={36} />} title={t("rx.emptyTitle")} body={t("rx.emptyBody")} />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {profile.prescriptions.map((rx) => (
            <li key={rx.id}>
              <button type="button" className="card flex w-full items-center justify-between p-4 text-left" onClick={() => router.push(`/prescriptions/${rx.id}`)}>
                <span>
                  <span className="block font-medium">{rx.name}</span>
                  <span className="text-small text-ink-2">{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(rx.createdAt))}</span>
                </span>
                <Icon name="chevron" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending ? (
        <Sheet title={t("rx.name")} onClose={() => setPending(null)}>
          {pending.kind === "image" ? <img src={pending.dataUrl} alt="" className="mb-3 max-h-48 w-full rounded-xl object-contain" /> : <p className="mb-3 text-ink-2">PDF</p>}
          <label className="text-small text-ink-2" htmlFor="rx-name">{t("rx.name")}</label>
          <input id="rx-name" className="field mt-2 w-full" value={name} onChange={(event) => setName(event.target.value)} />
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={!name.trim()} onClick={() => { addPrescription({ ...pending, name: name.trim() }); setPending(null); }}>{t("rx.save")}</button>
        </Sheet>
      ) : null}
    </div>
  );
}

export function PrescriptionView({ id }: { id: string }) {
  const t = useTranslations("care");
  const router = useRouter();
  const { ready, profile, deletePrescription, renamePrescription } = useCare();
  const rx = profile.prescriptions.find((item) => item.id === id);
  const [confirm, setConfirm] = useState(false);
  const [name, setName] = useState(rx?.name ?? "");
  useEffect(() => {
    if (rx) setName(rx.name);
  }, [rx]);
  if (!ready) return <div className="min-h-svh" />;
  if (!rx) return <p className="px-5 py-10 text-ink-2">{t("rx.missing")}</p>;
  return (
    <div className="container-page py-8 lg:py-10">
      <ScreenHeader title={rx.name} onBack={() => router.push("/prescriptions")} />
      {rx.kind === "image" ? (
        <img src={rx.dataUrl} alt={rx.name} className="mt-4 w-full rounded-[18px] border border-line" />
      ) : (
        <a href={rx.dataUrl} download={`${rx.name}.pdf`} className="btn btn-secondary mt-4 w-full">{t("rx.openPdf")}</a>
      )}
      <label className="mt-4 block text-small text-ink-2" htmlFor="rename">{t("rx.name")}</label>
      <input id="rename" className="field mt-2 w-full" value={name} onChange={(event) => setName(event.target.value)} />
      <button type="button" className="btn btn-secondary mt-3 w-full" onClick={() => renamePrescription(rx.id, name.trim() || rx.name)}>{t("common.save")}</button>
      <button type="button" className="btn btn-danger mt-3 w-full" onClick={() => setConfirm(true)}>{t("rx.delete")}</button>
      {confirm ? (
        <Sheet title={t("rx.deleteTitle")} onClose={() => setConfirm(false)}>
          <p className="text-ink-2">{t("rx.deleteBody")}</p>
          <button type="button" className="btn btn-danger mt-4 w-full" onClick={() => { deletePrescription(rx.id); router.push("/prescriptions"); }}>{t("rx.delete")}</button>
        </Sheet>
      ) : null}
    </div>
  );
}
