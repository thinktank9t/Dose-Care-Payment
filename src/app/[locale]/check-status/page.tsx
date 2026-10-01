import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PremiumStatusCheck } from "@/components/PremiumStatusCheck";
import { supportEmail } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkStatus");
  return { title: t("title") };
}

export default async function CheckStatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checkStatus");

  return (
    <div className="container-page py-12">
      <div className="max-w-2xl">
        <h1>{t("title")}</h1>
        <p className="mt-3 text-body-lg text-ink-2">{t("subtitle")}</p>

        <div className="mt-8">
          <PremiumStatusCheck supportEmail={supportEmail()} />
        </div>
      </div>
    </div>
  );
}
