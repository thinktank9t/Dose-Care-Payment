export type PlanPeriod = "monthly" | "yearly";

export const PLAN_PERIODS: readonly PlanPeriod[] = ["monthly", "yearly"];

export function isPlanPeriod(value: unknown): value is PlanPeriod {
  return value === "monthly" || value === "yearly";
}

function readBdt(name: string): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * BDT prices come from env so ops can set them without a deploy of copy.
 * A value of 0 means "not configured yet" — the UI shows a TODO marker and
 * the server refuses submissions until it is set.
 */
export function bdtPrices(): Record<PlanPeriod, number> {
  return {
    monthly: readBdt("NEXT_PUBLIC_PRICE_MONTHLY_BDT"),
    yearly: readBdt("NEXT_PUBLIC_PRICE_YEARLY_BDT"),
  };
}

/**
 * Feature comparison table. Strings are i18n keys under `features`. A value
 * is "included", "unlimited", or a limit with its unit, so the cell can say
 * "1 person" / "Up to 3" rather than a bare number.
 */
export type FeatureValue = "included" | "unlimited" | { people: number } | { upTo: number };
export const FEATURE_ROWS: readonly {
  key: "reminders" | "caregivers" | "patients" | "prescriptions";
  free: FeatureValue;
  premium: FeatureValue;
}[] = [
  { key: "reminders", free: "included", premium: "included" },
  { key: "caregivers", free: { people: 1 }, premium: "unlimited" },
  { key: "patients", free: { people: 1 }, premium: "unlimited" },
  { key: "prescriptions", free: { upTo: 3 }, premium: "unlimited" },
];
