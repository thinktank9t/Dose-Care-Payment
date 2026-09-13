import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

const USER_COLUMNS =
  "id,name,email,avatar_url,is_anonymous,google_id,plan,premium_until,plan_period,plan_source";

const PAYMENT_COLUMNS =
  "id,user_id,provider,trx_id,sender_number,plan_period,amount_bdt,status,note,verified_by,verified_at,created_at";

function normalizePayment(row: Record<string, unknown>): PaymentRow {
  return {
    ...(row as PaymentRow),
    amount_bdt: row.amount_bdt === null ? null : Number(row.amount_bdt),
  };
}

export class SupabaseRepo implements Repo {
  private get db() {
    return supabaseAdmin();
  }

  async getUserByAuthId(authId: string): Promise<UserRow | null> {
    const { data, error } = await this.db
      .from("users")
      .select(USER_COLUMNS)
      .eq("google_id", authId)
      .maybeSingle();
    if (error) throw new Error(`users lookup failed: ${error.message}`);
    return (data as UserRow | null) ?? null;
  }

  async createUser(input: NewUser): Promise<UserRow> {
    const { data, error } = await this.db
      .from("users")
      .insert({
        google_id: input.authId,
        is_anonymous: false,
        name: input.name,
        email: input.email,
        avatar_url: input.avatarUrl,
        usage_reasons: [],
      })
      .select(USER_COLUMNS)
      .single();
    if (error) {
      // Lost a race with the app creating the row: read it instead.
      if (error.code === "23505") {
        const existing = await this.getUserByAuthId(input.authId);
        if (existing) return existing;
      }
      throw new Error(`users insert failed: ${error.message}`);
    }
    return data as UserRow;
  }

  async listPaymentsForUser(userId: string): Promise<PaymentRow[]> {
    const { data, error } = await this.db
      .from("payments")
      .select(PAYMENT_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`payments lookup failed: ${error.message}`);
    return (data ?? []).map((r) => normalizePayment(r as Record<string, unknown>));
  }

  async countPending(userId: string): Promise<number> {
    const { count, error } = await this.db
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(`payments count failed: ${error.message}`);
    return count ?? 0;
  }

  async createPayment(input: NewPayment): Promise<CreatePaymentResult> {
    const { data, error } = await this.db
      .from("payments")
      .insert({
        user_id: input.userId,
        provider: "bkash",
        trx_id: input.trxId,
        sender_number: input.senderNumber,
        plan_period: input.planPeriod,
        amount_bdt: input.amountBdt,
      })
      .select(PAYMENT_COLUMNS)
      .single();

    if (error) {
      if (error.code === "23505") return { ok: false, error: "duplicate_trx" };
      if (error.message.includes("PAYMENT_LIMIT")) {
        return { ok: false, error: "too_many_pending" };
      }
      if (error.code === "23514") return { ok: false, error: "invalid" };
      throw new Error(`payments insert failed: ${error.message}`);
    }
    return { ok: true, payment: normalizePayment(data as Record<string, unknown>) };
  }

  async isAdmin(email: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("admin_users")
      .select("email")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    if (error) throw new Error(`admin lookup failed: ${error.message}`);
    return data !== null;
  }

  async listPaymentsForAdmin(filter: AdminFilter): Promise<AdminPaymentRow[]> {
    let query = this.db
      .from("payments")
      .select(`${PAYMENT_COLUMNS},user:users!payments_user_id_fkey(id,name,email)`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (filter !== "all") query = query.eq("status", filter);

    const { data, error } = await query;
    if (error) throw new Error(`admin payments lookup failed: ${error.message}`);

    return (data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const user = row.user as AdminPaymentRow["user"] | null;
      return {
        ...normalizePayment(row),
        user: user ?? { id: String(row.user_id), name: "", email: null },
      };
    });
  }

  async verifyPayment(paymentId: string, adminEmail: string, note: string | null) {
    const { data, error } = await this.db.rpc("verify_payment", {
      p_payment_id: paymentId,
      p_admin_email: adminEmail,
      p_note: note,
    });
    if (error) throw new Error(`verify_payment failed: ${error.message}`);
    return data === true;
  }

  async rejectPayment(paymentId: string, adminEmail: string, note: string | null) {
    const { data, error } = await this.db.rpc("reject_payment", {
      p_payment_id: paymentId,
      p_admin_email: adminEmail,
      p_note: note,
    });
    if (error) throw new Error(`reject_payment failed: ${error.message}`);
    return data === true;
  }
}
