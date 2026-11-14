import { useTranslations } from "next-intl";
import { FEATURE_ROWS, type FeatureValue } from "@/lib/plans";
import { Sparkle } from "./Sparkle";

/** "1 person" / "১ জন", "Up to 3" / "সর্বোচ্চ ৩টি": numbers in the page's own digits. */
function cell(t: ReturnType<typeof useTranslations<"features">>, v: FeatureValue) {
  if (v === "included") return t("included");
  if (v === "unlimited") return t("unlimited");
  if ("people" in v) return t("people", { count: v.people });
  return t("upTo", { count: v.upTo });
}

/**
 * The card border is the only outer line. Row hairlines are inset by the card
 * padding. Feature names take ~46% and wrap; Free and Premium stay on one line
 * so the two value columns read straight down even at 360px.
 */
export function ComparisonTable({ bare = false }: { bare?: boolean } = {}) {
  const t = useTranslations("features");
  return (
    // bare: no card of its own, for use inside another card.
    <div className={bare ? "" : "card px-4 sm:px-5"}>
      <table className="w-full table-fixed border-collapse text-[15px]">
        <colgroup>
          <col className="w-[46%]" />
          <col className="w-[27%]" />
          <col className="w-[27%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="py-3 pr-2 text-left label-micro font-semibold">
              {t("heading")}
            </th>
            <th scope="col" className="whitespace-nowrap px-1 py-3 text-center label-micro font-semibold">
              {t("free")}
            </th>
            <th scope="col" className="whitespace-nowrap py-3 pl-1 text-center label-micro font-semibold text-accent-ink">
              <span className="inline-flex items-center gap-1">
                <Sparkle size={12} />
                {t("premium")}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {FEATURE_ROWS.map((row) => (
            <tr key={row.key} className="border-b border-line last:border-b-0">
              <th scope="row" className="py-4 pr-2 text-left font-normal">
                <span className="block font-medium text-ink">{t(row.key)}</span>
                <span className="mt-0.5 block text-small text-ink-2">{t(`${row.key}Hint`)}</span>
              </th>
              <td className="whitespace-nowrap px-1 py-4 text-center text-ink-2">{cell(t, row.free)}</td>
              <td className="whitespace-nowrap py-4 pl-1 text-center font-semibold text-accent-ink">
                {cell(t, row.premium)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
