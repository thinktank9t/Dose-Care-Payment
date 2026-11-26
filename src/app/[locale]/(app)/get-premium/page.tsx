import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClaimPremiumForm } from "@/components/ClaimPremiumForm";
import { CheckStatusCard } from "@/components/CheckStatusCard";
import { ComparisonTable } from "@/components/ComparisonTable";
import { Icon } from "@/components/care/chrome";
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
    <div className="container-page py-8 lg:py-10">
      <div className="mx-auto max-w-2xl">
        <h1>{t("title")}</h1>
        <p className="mt-3 text-body-lg text-ink-2">{t("subtitle")}</p>

        {/* The person already chose Premium: the payment steps come first. */}
        <div className="mt-8">
          <ClaimPremiumForm initialPlan={plan} defaultEmail={email} />
        </div>

        {/* What's included, for anyone who wants to check, collapsed so it
            never sits between them and paying. */}
        <details className="group card mt-6" data-testid="premium-included">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium text-ink [&::-webkit-details-marker]:hidden">
            {tl("compareTitle")}
            <span className="shrink-0 text-ink-2 transition-transform group-open:rotate-90">
              <Icon name="chevron" size={18} />
            </span>
          </summary>
          <div className="mx-4 border-t border-line pb-1">
            <ComparisonTable bare />
          </div>
        </details>

        <div className="mt-6">
          <CheckStatusCard />
        </div>
      </div>
    </div>
  );
}
