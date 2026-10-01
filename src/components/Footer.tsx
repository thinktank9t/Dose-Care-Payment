import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { supportEmail } from "@/lib/env";
import { Sparkle } from "./Sparkle";

function MailIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
      <path d="m3.5 7 7.4 5.3a2 2 0 0 0 2.2 0L20.5 7" />
    </svg>
  );
}

function ArrowUpIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}

const linkClass = "text-ink-2 transition-colors hover:text-ink";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const email = supportEmail();

  return (
    <footer className="mt-20 border-t border-line bg-bg-alt/60">
      <div className="container-page py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] lg:gap-8">
          {/* Brand */}
          <div className="max-w-[34ch]">
            <Link href="/" className="inline-flex items-center gap-2 font-heading text-[19px] text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
                <Sparkle size={16} />
              </span>
              <span>Dose Care</span>
            </Link>
            <p className="mt-4 text-small text-ink-2">{t("tagline")}</p>
            <a
              href={`mailto:${email}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-small font-medium text-accent-ink transition-colors hover:border-accent"
            >
              <MailIcon />
              <span className="break-all">{email}</span>
            </a>
            <p className="mt-4 text-small text-ink-3">{t("payments")}</p>
          </div>

          {/* Product */}
          <nav aria-labelledby="footer-product">
            <p id="footer-product" className="label-micro">
              {t("productHeading")}
            </p>
            <ul className="mt-4 space-y-2.5 text-small">
              <li>
                <Link href="/#pricing" className={linkClass}>
                  {nav("pricing")}
                </Link>
              </li>
              <li>
                <Link href="/get-premium" className={linkClass}>
                  {nav("getPremium")}
                </Link>
              </li>
              <li>
                <Link href="/check-status" className={linkClass}>
                  {t("checkStatus")}
                </Link>
              </li>
              <li>
                <Link href="/#compare" className={linkClass}>
                  {t("compare")}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-labelledby="footer-legal">
            <p id="footer-legal" className="label-micro">
              {t("legalHeading")}
            </p>
            <ul className="mt-4 space-y-2.5 text-small">
              <li>
                <Link href="/privacy" className={linkClass}>
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkClass}>
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className={linkClass}>
                  {t("refund")}
                </Link>
              </li>
              <li>
                <a href={`mailto:${email}`} className={linkClass}>
                  {t("contact")}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-small text-ink-3 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>{t("madeIn")}</span>
            <a href="#main" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
              <ArrowUpIcon size={13} />
              {t("backToTop")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
