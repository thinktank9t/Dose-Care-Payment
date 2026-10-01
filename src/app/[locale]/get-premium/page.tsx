import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClaimPremiumForm } from "@/components/ClaimPremiumForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("getPremium");
  return { title: t("title") };
}

export default async function GetPremiumPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { plan } = await searchParams;
  const t = await getTranslations("getPremium");

  return (
    <div className="container-page py-12">
      <div className="max-w-2xl">
        <h1>{t("title")}</h1>
        <p className="mt-3 text-body-lg text-ink-2">{t("subtitle")}</p>

        <div className="mt-8">
          <ClaimPremiumForm initialPlan={plan} />
        </div>
      </div>
    </div>
  );
}
