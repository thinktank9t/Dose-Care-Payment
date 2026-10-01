import { supabaseAnon } from "@/lib/supabase/anon";

/**
 * The bKash number users send money to. Change it here (or set
 * NEXT_PUBLIC_BKASH_NUMBER, which wins) — it is not repeated anywhere else.
 */
export const BKASH_NUMBER = process.env.NEXT_PUBLIC_BKASH_NUMBER || "01712345678";

/** A row of `plans`. `amount` is BDT; `duration` is a Postgres interval. */
export type ClaimPlan = {
  period: string;
  amount: number;
  duration: string;
};

export const CLAIM_CODES = [
  "SUCCESS",
  "INVALID_INPUT",
  "USER_NOT_FOUND",
  "ANONYMOUS_USER",
  "NOT_EXIST",
  "ALREADY_ACTIVATED",
  "ALREADY_USED",
  "AMOUNT_MISSING",
  "AMOUNT_MISMATCH",
  "NOT_A_PLAN_PRICE",
  "TOO_OLD",
] as const;

export type ClaimCode = (typeof CLAIM_CODES)[number];

export type ClaimResult = {
  code: string;
  message?: string;
  plan_period?: string;
  premium_until?: string;
};

/** Message key under the `getPremium` namespace for each documented code. */
export const CLAIM_CODE_KEY: Record<ClaimCode, string> = {
  SUCCESS: "codeSuccess",
  INVALID_INPUT: "codeInvalidInput",
  USER_NOT_FOUND: "codeUserNotFound",
  ANONYMOUS_USER: "codeAnonymousUser",
  NOT_EXIST: "codeNotExist",
  ALREADY_ACTIVATED: "codeAlreadyActivated",
  ALREADY_USED: "codeAlreadyUsed",
  AMOUNT_MISSING: "codeAmountMissing",
  AMOUNT_MISMATCH: "codeAmountMismatch",
  NOT_A_PLAN_PRICE: "codeNotAPlanPrice",
  TOO_OLD: "codeTooOld",
};

export function isClaimCode(value: string): value is ClaimCode {
  return (CLAIM_CODES as readonly string[]).includes(value);
}

/**
 * Active plans, cheapest first. RLS already hides inactive rows, so the
 * select stays to the three columns the page renders.
 */
export async function fetchActivePlans(): Promise<ClaimPlan[]> {
  const { data, error } = await supabaseAnon()
    .from("plans")
    .select("period, amount, duration")
    .order("amount");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    period: String(row.period),
    amount: Number(row.amount),
    duration: String(row.duration ?? ""),
  }));
}

export type DurationParts = { count: number; unit: "day" | "week" | "month" | "year" };

/**
 * Postgres renders intervals as "1 mon", "1 year", "30 days". Parse the first
 * unit so the UI can say it in the reader's language; null means "show as is".
 */
export function parseDuration(interval: string): DurationParts | null {
  const m = /(\d+)\s*(day|week|mon|year)/i.exec(interval);
  if (!m) return null;
  const unit = m[2].toLowerCase();
  return {
    count: Number(m[1]),
    unit: unit === "mon" ? "month" : (unit as DurationParts["unit"]),
  };
}

const DAYS_IN: Record<DurationParts["unit"], number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

/** Roughly how long a plan lasts, for ordering and price-per-day maths. */
export function planDays(plan: ClaimPlan): number {
  const parsed = parseDuration(plan.duration);
  return parsed ? parsed.count * DAYS_IN[parsed.unit] : 0;
}

/** Shortest period first — the usual pricing-page order, and our baseline. */
export function byDuration(a: ClaimPlan, b: ClaimPlan): number {
  return planDays(a) - planDays(b);
}

/**
 * Best value is the cheapest *per day*, not the cheapest or dearest sticker
 * price — a long plan can legitimately cost more up front and still win.
 */
export function bestValuePeriod(plans: ClaimPlan[]): string | null {
  const rated = plans.filter((p) => planDays(p) > 0);
  if (rated.length < 2) return null;
  return rated.reduce((best, p) =>
    p.amount / planDays(p) < best.amount / planDays(best) ? p : best,
  ).period;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
