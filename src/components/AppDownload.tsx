import { getTranslations } from "next-intl/server";
import { playStore } from "@/lib/env";
import { QrCode } from "./QrCode";
import { SectionLabel } from "./SectionLabel";

/** A plain play triangle, in one colour — not Google's badge artwork. */
function PlayGlyph({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 3.2v17.6a1.2 1.2 0 0 0 1.82 1.03l14.6-8.8a1.2 1.2 0 0 0 0-2.06L7.82 2.17A1.2 1.2 0 0 0 6 3.2z" />
    </svg>
  );
}

/**
 * "Download the app" band on the landing page.
 *
 * The QR code is generated from whatever `playStore()` returns, so when the
 * real listing URL is set the code and the button both point at it. Until then
 * the button is inert and labelled "coming soon" rather than a dead link.
 */
export async function AppDownload() {
  const t = await getTranslations("app");
  const { url, isPlaceholder } = playStore();

  return (
    <section className="py-10" aria-labelledby="app-h">
      <div className="card flex flex-col gap-8 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-[46ch]">
          <SectionLabel className="mb-3">{t("label")}</SectionLabel>
          <h2 id="app-h">{t("title")}</h2>
          <p className="mt-4 text-ink-2">{t("body")}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isPlaceholder ? (
              <span
                className="btn btn-secondary cursor-not-allowed opacity-60"
                aria-disabled="true"
                data-testid="play-store-pending"
              >
                <PlayGlyph />
                {t("playStore")}
              </span>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                data-testid="play-store-link"
              >
                <PlayGlyph />
                {t("playStore")}
              </a>
            )}
            {isPlaceholder ? (
              <span className="pill bg-warn-soft text-warn">{t("comingSoon")}</span>
            ) : null}
          </div>

          {isPlaceholder ? (
            <p className="mt-4 text-small text-ink-2">{t("comingSoonNote")}</p>
          ) : null}
        </div>

        {/* QR card. The quiet zone is part of the SVG, hence the tight padding. */}
        <div className="shrink-0 self-start md:self-center">
          <div className="w-fit rounded-2xl border border-line bg-surface p-3">
            <QrCode value={url} size={148} title={t("qrAlt")} />
          </div>
          <p className="mt-3 text-center text-small text-ink-2">{t("scan")}</p>
        </div>
      </div>
    </section>
  );
}
