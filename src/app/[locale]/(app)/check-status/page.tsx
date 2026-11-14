import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PremiumStatusCheck } from "@/components/PremiumStatusCheck";
import { ScreenHeader } from "@/components/care/chrome";
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
    <div className="container-page py-8 lg:py-10">
      <div className="mx-auto max-w-2xl">
        <ScreenHeader title={t("title")} backHref="/profile" />
        <p className="mt-2 text-body-lg text-ink-2">{t("subtitle")}</p>

        <div className="mt-8">
          <PremiumStatusCheck supportEmail={supportEmail()} />
        </div>
      </div>
    </div>
  );
}
