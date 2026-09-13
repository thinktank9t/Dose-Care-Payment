"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex justify-center py-20">
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="text-[28px]">{t("errorTitle")}</h1>
        <p className="mt-3 text-ink-2">{t("errorBody")}</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn btn-primary">
            {t("retry")}
          </button>
          <Link href="/" className="btn btn-secondary">
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
