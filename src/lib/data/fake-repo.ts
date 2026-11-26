import "server-only";
import { randomUUID } from "node:crypto";
import type {
  AdminFilter,
  AdminPaymentRow,
  CreatePaymentResult,
  NewPayment,
  NewUser,
  PaymentRow,
  Repo,
  UserRow,
} from "./types";

/**
 * In-memory stand-in for the Supabase project, used only when
 * E2E_FAKE_BACKEND=1. Mirrors the rules in
 * supabase/migrations/20260913180000_website_payments.sql and the premium
 * writer rules in 20261127000000_align_premium_writers.sql so the Playwright
 * suite exercises the same behaviour: trx normalisation, uniqueness, the
 * 5-pending limit, idempotent verify/reject and premium stacking.
 */
type Store = {
  users: Map<string, UserRow>;
  payments: Map<string, PaymentRow>;
  admins: Set<string>;
};

const g = globalThis as unknown as { __doseCareFakeStore?: Store };

function store(): Store {
  if (!g.__doseCareFakeStore) {
    g.__doseCareFakeStore = {
      users: new Map(),
      payments: new Map(),
      admins: new Set(["admin@example.com"]),
    };
  }
  return g.__doseCareFakeStore;
}

/** Test hook: wipe everything (exposed through /auth/fake?reset=1). */
export function resetFakeStore() {
  g.__doseCareFakeStore = undefined;
}

/**
 * Mirrors grant_premium(): fixed 30/365 days (not calendar months), ending at
 * 00:00 Asia/Dhaka like dhaka_day_start_after(). Dhaka is UTC+6 with no DST,
 * so the boundary is 18:00 UTC the previous day.
 */
function addPeriod(from: Date, period: "monthly" | "yearly"): Date {
  const days = period === "monthly" ? 30 : 365;
  const dhaka = new Date(from.getTime() + 6 * 3600_000);
  const dayStart = Date.UTC(
    dhaka.getUTCFullYear(),
    dhaka.getUTCMonth(),
    dhaka.getUTCDate(),
  );
  return new Date(dayStart + days * 86_400_000 - 6 * 3600_000);
}

export class FakeRepo implements Repo {
  async getUserByAuthId(authId: string): Promise<UserRow | null> {
    for (const u of store().users.values()) {
      if (u.google_id === authId) return { ...u };
    }
    return null;
  }

  async createUser(input: NewUser): Promise<UserRow> {
    const existing = await this.getUserByAuthId(input.authId);
    if (existing) return existing;
    const user: UserRow = {
      id: randomUUID(),
      name: input.name,
      email: input.email,
      avatar_url: input.avatarUrl,
      is_anonymous: false,
      google_id: input.authId,
      plan: "free",
      premium_until: null,
      plan_period: null,
      plan_source: null,
    };
    store().users.set(user.id, user);
    return { ...user };
  }

  async listPaymentsForUser(userId: string): Promise<PaymentRow[]> {
    return [...store().payments.values()]
      .filter((p) => p.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async countPending(userId: string): Promise<number> {
    return [...store().payments.values()].filter(
      (p) => p.user_id === userId && p.status === "pending",
    ).length;
  }

  async createPayment(input: NewPayment): Promise<CreatePaymentResult> {
    const trxId = input.trxId.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(trxId)) return { ok: false, error: "invalid" };
    for (const p of store().payments.values()) {
      if (p.trx_id === trxId) return { ok: false, error: "duplicate_trx" };
    }
    if ((await this.countPending(input.userId)) >= 5) {
      return { ok: false, error: "too_many_pending" };
    }
    const payment: PaymentRow = {
      id: randomUUID(),
      user_id: input.userId,
      provider: "bkash",
      trx_id: trxId,
      sender_number: input.senderNumber,
      plan_period: input.planPeriod,
      amount_bdt: input.amountBdt,
      status: "pending",
      note: null,
      verified_by: null,
      verified_at: null,
      created_at: new Date().toISOString(),
    };
    store().payments.set(payment.id, payment);
    return { ok: true, payment: { ...payment } };
  }

  async isAdmin(email: string): Promise<boolean> {
    return store().admins.has(email.trim().toLowerCase());
  }

  async listPaymentsForAdmin(filter: AdminFilter): Promise<AdminPaymentRow[]> {
    return [...store().payments.values()]
      .filter((p) => filter === "all" || p.status === filter)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((p) => {
        const u = store().users.get(p.user_id);
        return {
          ...p,
          user: u
            ? { id: u.id, name: u.name, email: u.email }
            : { id: p.user_id, name: "", email: null },
        };
      });
  }

  async verifyPayment(paymentId: string, adminEmail: string, note: string | null) {
    if (!(await this.isAdmin(adminEmail))) throw new Error("NOT_ADMIN");
    const p = store().payments.get(paymentId);
    if (!p || p.status !== "pending") return false;
    p.status = "verified";
    p.note = note?.trim() || null;
    p.verified_by = adminEmail.trim().toLowerCase();
    p.verified_at = new Date().toISOString();

    // grant_premium(): extend from the current end when still premium, so
    // periods never overlap. Trials are not modelled here; the real function
    // also starts from trial_ends_at so buying early does not burn trial days.
    const u = store().users.get(p.user_id);
    if (!u) throw new Error("USER_NOT_FOUND");
    const now = new Date();
    const current = u.premium_until ? new Date(u.premium_until) : now;
    const base = current > now ? current : now;
    u.plan = "premium";
    u.premium_until = addPeriod(base, p.plan_period).toISOString();
    u.plan_period = p.plan_period;
    u.plan_source = "bkash_manual";
    return true;
  }

  async rejectPayment(paymentId: string, adminEmail: string, note: string | null) {
    if (!(await this.isAdmin(adminEmail))) throw new Error("NOT_ADMIN");
    const p = store().payments.get(paymentId);
    if (!p || p.status !== "pending") return false;
    p.status = "rejected";
    p.note = note?.trim() || null;
    p.verified_by = adminEmail.trim().toLowerCase();
    p.verified_at = new Date().toISOString();
    return true;
  }
}
