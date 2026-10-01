import { supabaseAnon } from "@/lib/supabase/anon";

/** One row of `payments`, as `get_premium_status()` nests it. */
export type StatusPayment = {
  amount: number | null;
  trx_id: string | null;
  paid_at: string | null;
};

/** The JSON returned by `public.get_premium_status(p_email)`. */
export type PremiumStatusResult = {
  code: string;
  plan: string | null;
  days_left: number | null;
  is_premium: boolean;
  has_pending: boolean;
  plan_period: string | null;
  plan_source: string | null;
  last_payment: StatusPayment | null;
  premium_since: string | null;
  premium_until: string | null;
  recent_requests: unknown[];
};

export const STATUS_CODES = [
  "OK",
  "INVALID_INPUT",
  "USER_NOT_FOUND",
  "ANONYMOUS_USER",
] as const;

export type StatusCode = (typeof STATUS_CODES)[number];

/** Message key under the `checkStatus` namespace for each documented code. */
export const STATUS_CODE_KEY: Record<StatusCode, string> = {
  OK: "codeOk",
  INVALID_INPUT: "codeInvalidInput",
  USER_NOT_FOUND: "codeUserNotFound",
  ANONYMOUS_USER: "codeAnonymousUser",
};

export function isStatusCode(value: string): value is StatusCode {
  return (STATUS_CODES as readonly string[]).includes(value);
}

/**
 * What the card should say, derived from the raw JSON.
 *
 * `pending` is deliberately *not* an error state: the money has arrived and an
 * admin only has to tick it off, so it reads as "on its way", not "failed".
 * A pending payment on top of live Premium is an extension, so `premium` wins
 * and carries `pendingExtra` instead.
 */
export type PremiumView =
  | {
      kind: "premium";
      period: string | null;
      until: Date | null;
      since: Date | null;
      daysLeft: number | null;
      source: string | null;
      lastPayment: StatusPayment | null;
      pendingExtra: boolean;
    }
  | { kind: "pending"; lastPayment: StatusPayment | null }
  | { kind: "expired"; until: Date; lastPayment: StatusPayment | null }
  | { kind: "none" };

const date = (value: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function premiumView(
  result: PremiumStatusResult,
  now: Date = new Date(),
): PremiumView {
  const until = date(result.premium_until);
  const lastPayment = result.last_payment ?? null;

  if (result.is_premium) {
    return {
      kind: "premium",
      period: result.plan_period,
      until,
      since: date(result.premium_since),
      // Trust the server's count when it sent one; fall back to the end date
      // so a null `days_left` on a dated plan still shows a number.
      daysLeft:
        typeof result.days_left === "number"
          ? result.days_left
          : until
            ? Math.max(0, Math.ceil((until.getTime() - now.getTime()) / 86_400_000))
            : null,
      source: result.plan_source,
      lastPayment,
      pendingExtra: result.has_pending,
    };
  }

  if (result.has_pending) return { kind: "pending", lastPayment };
  if (until && until.getTime() <= now.getTime()) return { kind: "expired", until, lastPayment };
  return { kind: "none" };
}

/**
 * Look a user up by the email they typed. Anonymous on purpose — the visitor
 * has no Supabase session here, exactly as on the claim form.
 */
export async function fetchPremiumStatus(email: string): Promise<PremiumStatusResult> {
  // Arg name matches `claim_premium(p_email, …)`.
  const { data, error } = await supabaseAnon().rpc("get_premium_status", {
    p_email: email,
  });

  if (error) throw new Error(error.message);
  return (data ?? { code: "UNKNOWN" }) as PremiumStatusResult;
}
