"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getSession, isAdminSession } from "@/lib/auth/session";
import { getRepo } from "@/lib/data/repo";

export type AdminActionState =
  | { status: "idle" }
  | { status: "done"; changed: boolean; action: "verify" | "reject" }
  | { status: "error"; error: "forbidden" | "invalid" | "unknown" };

const schema = z.object({
  paymentId: z.string().uuid(),
  action: z.enum(["verify", "reject"]),
  note: z.string().max(500).optional().default(""),
});

/**
 * Server Action for the admin dashboard. The admin check happens here on
 * every call (not just when the page rendered), and the DB functions are
 * idempotent so a double click is a no-op.
 */
export async function reviewPayment(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await getSession();
  if (!(await isAdminSession(session)) || !session?.email) {
    return { status: "error", error: "forbidden" };
  }

  const parsed = schema.safeParse({
    paymentId: formData.get("paymentId"),
    action: formData.get("action"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { status: "error", error: "invalid" };
  const { paymentId, action, note } = parsed.data;

  const repo = await getRepo();
  const changed =
    action === "verify"
      ? await repo.verifyPayment(paymentId, session.email, note || null)
      : await repo.rejectPayment(paymentId, session.email, note || null);

  const locale = await getLocale();
  revalidatePath(`/${locale}/admin/payments`);
  revalidatePath(`/${locale}/account`);
  return { status: "done", changed, action };
}
