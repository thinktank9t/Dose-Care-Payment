import { useTranslations } from "next-intl";
import { FEATURE_ROWS } from "@/lib/plans";
import { Sparkle } from "./Sparkle";

function cell(t: ReturnType<typeof useTranslations<"features">>, v: string) {
  if (v === "included") return t("included");
  if (v === "unlimited") return t("unlimited");
  return v;
}

export function ComparisonTable() {
  const t = useTranslations("features");
  return (
    <div className="card overflow-hidden">
      <table className="w-full border-collapse text-[15px]">
        <thead>
          <tr className="border-b border-line bg-bg-alt/60">
            <th scope="col" className="px-4 py-3 text-left label-micro font-semibold">
              {t("heading")}
            </th>
            <th scope="col" className="px-4 py-3 text-center label-micro font-semibold">
              {t("free")}
            </th>
            <th scope="col" className="px-4 py-3 text-center label-micro font-semibold text-accent-ink">
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
              <th scope="row" className="px-4 py-4 text-left font-medium text-ink">
                {t(row.key)}
              </th>
              <td className="px-4 py-4 text-center text-ink-2">{cell(t, row.free)}</td>
              <td className="px-4 py-4 text-center font-semibold text-accent-ink">
                {cell(t, row.premium)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
