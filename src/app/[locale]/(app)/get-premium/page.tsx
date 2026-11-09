import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClaimPremiumForm } from "@/components/ClaimPremiumForm";
import { CheckStatusCard } from "@/components/CheckStatusCard";
import { ComparisonTable } from "@/components/ComparisonTable";
import { SectionLabel } from "@/components/SectionLabel";
import { getSession } from "@/lib/auth/session";

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
  const tl = await getTranslations("landing");
  let email: string | null = null;
  try {
    email = (await getSession())?.email ?? null;
  } catch {
    // Prefill is a convenience; the form still works empty.
  }

  return (
    <div className="container-page py-12">
      <div className="max-w-2xl">
        <h1>{t("title")}</h1>
        <p className="mt-3 text-body-lg text-ink-2">{t("subtitle")}</p>

        {/* Say what Premium gives before asking for money. */}
        <section className="mt-8" aria-labelledby="included-h" data-testid="premium-included">
          <SectionLabel>{tl("compareLabel")}</SectionLabel>
          <h2 id="included-h" className="mt-2 text-[22px]">
            {tl("compareTitle")}
          </h2>
          <div className="mt-4">
            <ComparisonTable />
          </div>
        </section>

        <div className="mt-8">
          <ClaimPremiumForm initialPlan={plan} defaultEmail={email} />
        </div>

        <div className="mt-6">
          <CheckStatusCard />
        </div>
      </div>
    </div>
  );
}
