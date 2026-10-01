import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppDownload } from "@/components/AppDownload";
import { CheckStatusCard } from "@/components/CheckStatusCard";
import { ComparisonTable } from "@/components/ComparisonTable";
import { PriceCards, PriceCardsSkeleton } from "@/components/PriceCards";
import { SectionLabel } from "@/components/SectionLabel";
import { Sparkle } from "@/components/Sparkle";

/** Prices are read from `plans`, so re-render every 5 minutes. */
export const revalidate = 300;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  const steps = [1, 2, 3] as const;
  const faqs = [1, 2, 3] as const;

  return (
    <div className="container-page">
      {/* Hero */}
      <section className="py-14 sm:py-20">
        <SectionLabel className="mb-4 flex items-center gap-2">
          <Sparkle size={12} className="text-accent" />
          {t("label")}
        </SectionLabel>
        <h1 className="max-w-[16ch]">{t("title")}</h1>
        <p className="mt-5 max-w-[56ch] text-body-lg text-ink-2">{t("subtitle")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/get-premium" className="btn btn-primary" data-testid="cta-get-premium">
            <Sparkle size={16} />
            {t("cta")}
          </Link>
          <Link href="/#compare" className="btn btn-secondary">
            {t("secondaryCta")}
          </Link>
        </div>
        <p className="mt-4 text-small text-ink-2">{t("payWithBkash")}</p>
        <p className="mt-2 text-small text-ink-2">
          {t("alreadyPaid")}{" "}
          <Link
            href="/check-status"
            className="font-medium text-accent-ink underline"
            data-testid="hero-check-status"
          >
            {t("checkStatusCta")}
          </Link>
        </p>
      </section>

      {/* How it works */}
      <section className="py-10" aria-labelledby="how">
        <SectionLabel className="mb-3">{t("howLabel")}</SectionLabel>
        <h2 id="how">{t("howTitle")}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((n) => (
            <li key={n} className="card p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-heading text-[15px] text-accent-ink">
                {n}
              </span>
              <h3 className="mt-4 text-[18px]">{t(`step${n}Title`)}</h3>
              <p className="mt-2 text-small text-ink-2">{t(`step${n}Body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Comparison */}
      <section id="compare" className="scroll-mt-20 py-10" aria-labelledby="compare-h">
        <SectionLabel className="mb-3">{t("compareLabel")}</SectionLabel>
        <h2 id="compare-h">{t("compareTitle")}</h2>
        <div className="mt-6">
          <ComparisonTable />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-10" aria-labelledby="pricing-h">
        <SectionLabel className="mb-3">{t("pricingLabel")}</SectionLabel>
        <h2 id="pricing-h">{t("pricingTitle")}</h2>
        {/* The plans come from the database; stream them in so the rest of
            the page paints straight away instead of waiting on the query. */}
        <div className="mt-6">
          <Suspense fallback={<PriceCardsSkeleton />}>
            <PriceCards />
          </Suspense>
        </div>
        <p className="mt-4 text-small text-ink-2">{t("pricingNote")}</p>
        <div className="mt-6">
          <CheckStatusCard />
        </div>
      </section>

      {/* Get the app */}
      <AppDownload />

      {/* FAQ */}
      <section className="py-10" aria-labelledby="faq">
        <SectionLabel className="mb-3" >{t("faqLabel")}</SectionLabel>
        <h2 id="faq" className="sr-only">{t("faqLabel")}</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          {faqs.map((n) => (
            <div key={n} className="card p-5">
              <dt className="font-semibold text-ink">{t(`faq${n}Q`)}</dt>
              <dd className="mt-2 text-small text-ink-2">{t(`faq${n}A`)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
