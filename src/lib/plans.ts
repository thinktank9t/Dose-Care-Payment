export type PlanPeriod = "monthly" | "yearly";

export const PLAN_PERIODS: readonly PlanPeriod[] = ["monthly", "yearly"];

export function isPlanPeriod(value: unknown): value is PlanPeriod {
  return value === "monthly" || value === "yearly";
}

/** USD list prices (shown for reference; bKash is charged in BDT). */
export const USD_PRICES: Record<PlanPeriod, number> = {
  monthly: 4.99,
  yearly: 36.99,
};

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

/** Feature comparison table. Strings are i18n keys under `features`. */
export const FEATURE_ROWS = [
  { key: "reminders", free: "included", premium: "included" },
  { key: "caregivers", free: "1", premium: "unlimited" },
  { key: "patients", free: "1", premium: "unlimited" },
  { key: "prescriptions", free: "3", premium: "unlimited" },
] as const;
