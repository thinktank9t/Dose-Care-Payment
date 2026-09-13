import type { PlanPeriod } from "@/lib/plans";

export type PaymentStatus = "pending" | "verified" | "rejected";

/** Columns of `public.users` the website reads. Never renamed. */
export type UserRow = {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  is_anonymous: boolean;
  google_id: string | null;
  plan: "free" | "premium";
  premium_until: string | null;
  plan_period: PlanPeriod | null;
  plan_source: string | null;
};

export type PaymentRow = {
  id: string;
  user_id: string;
  provider: string;
  trx_id: string;
  sender_number: string | null;
  plan_period: PlanPeriod;
  amount_bdt: number | null;
  status: PaymentStatus;
  note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
};

export type AdminPaymentRow = PaymentRow & {
  user: Pick<UserRow, "id" | "name" | "email">;
};

export type NewUser = {
  authId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

export type NewPayment = {
  userId: string;
  trxId: string;
  senderNumber: string | null;
  planPeriod: PlanPeriod;
  amountBdt: number;
};

export type CreatePaymentResult =
  | { ok: true; payment: PaymentRow }
  | { ok: false; error: "duplicate_trx" | "too_many_pending" | "invalid" };

export type AdminFilter = PaymentStatus | "all";

/**
 * Everything the site needs from the database. There are two
 * implementations: Supabase (production) and an in-memory fake used by the
 * Playwright suite. All methods run on the server only.
 */
export interface Repo {
  getUserByAuthId(authId: string): Promise<UserRow | null>;
  createUser(input: NewUser): Promise<UserRow>;
  listPaymentsForUser(userId: string): Promise<PaymentRow[]>;
  countPending(userId: string): Promise<number>;
  createPayment(input: NewPayment): Promise<CreatePaymentResult>;
  isAdmin(email: string): Promise<boolean>;
  listPaymentsForAdmin(filter: AdminFilter): Promise<AdminPaymentRow[]>;
  /** Returns true when the payment was pending and is now verified. */
  verifyPayment(paymentId: string, adminEmail: string, note: string | null): Promise<boolean>;
  /** Returns true when the payment was pending and is now rejected. */
  rejectPayment(paymentId: string, adminEmail: string, note: string | null): Promise<boolean>;
}
