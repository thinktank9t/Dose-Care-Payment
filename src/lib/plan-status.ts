import type { PlanPeriod } from "./plans";

export type PlanColumns = {
  plan: string | null;
  premium_until: string | null;
  plan_period: string | null;
};

/**
 * Mirrors the app's status rules and `public.is_premium()`:
 *   premium  = plan = 'premium' AND (premium_until IS NULL OR premium_until > now())
 *   ended    = not premium AND premium_until is in the past (even if plan = 'free')
 *   free     = never subscribed (premium_until IS NULL)
 */
export type PlanStatus =
  | { kind: "free" }
  | { kind: "active"; period: PlanPeriod | null; until: Date | null }
  | { kind: "ended"; until: Date };

export function planStatus(user: PlanColumns, now: Date = new Date()): PlanStatus {
  const until = user.premium_until ? new Date(user.premium_until) : null;
  const period =
    user.plan_period === "monthly" || user.plan_period === "yearly"
      ? user.plan_period
      : null;

  if (user.plan === "premium" && (until === null || until.getTime() > now.getTime())) {
    return { kind: "active", period, until };
  }
  if (until !== null && until.getTime() <= now.getTime()) {
    return { kind: "ended", until };
  }
  return { kind: "free" };
}

export function isPremium(user: PlanColumns, now: Date = new Date()): boolean {
  return planStatus(user, now).kind === "active";
}
