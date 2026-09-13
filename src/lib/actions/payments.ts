"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getRepo } from "@/lib/data/repo";
import { bdtPrices, isPlanPeriod } from "@/lib/plans";
import {
  isValidTrxId,
  normalizeBdMobile,
  normalizeTrxId,
  BD_MOBILE_PATTERN,
} from "@/lib/trx";

export type SubmitState =
  | { status: "idle" }
  | { status: "success"; trxId: string }
  | {
      status: "error";
      error:
        | "trx_invalid"
        | "sender_invalid"
        | "plan_invalid"
        | "duplicate_trx"
        | "too_many_pending"
        | "price_unset"
        | "unauthenticated"
        | "unknown";
    };

const schema = z.object({
  trxId: z.string().transform(normalizeTrxId),
  senderNumber: z.string().optional().default("").transform(normalizeBdMobile),
  planPeriod: z.string(),
});

/** Server Action: everything is re-derived on the server (user, amount). */
export async function submitPayment(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const current = await getCurrentUser();
  if (!current) return { status: "error", error: "unauthenticated" };

  const parsed = schema.safeParse({
    trxId: formData.get("trxId") ?? "",
    senderNumber: formData.get("senderNumber") ?? "",
    planPeriod: formData.get("planPeriod") ?? "",
  });
  if (!parsed.success) return { status: "error", error: "unknown" };
  const { trxId, senderNumber, planPeriod } = parsed.data;

  if (!isValidTrxId(trxId)) return { status: "error", error: "trx_invalid" };
  if (senderNumber && !BD_MOBILE_PATTERN.test(senderNumber)) {
    return { status: "error", error: "sender_invalid" };
  }
  if (!isPlanPeriod(planPeriod)) return { status: "error", error: "plan_invalid" };

  const amount = bdtPrices()[planPeriod];
  if (amount <= 0) return { status: "error", error: "price_unset" };

  const repo = await getRepo();
  if ((await repo.countPending(current.user.id)) >= 5) {
    return { status: "error", error: "too_many_pending" };
  }

  const result = await repo.createPayment({
    userId: current.user.id,
    trxId,
    senderNumber: senderNumber || null,
    planPeriod,
    amountBdt: amount,
  });

  if (!result.ok) {
    if (result.error === "invalid") return { status: "error", error: "trx_invalid" };
    return { status: "error", error: result.error };
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/account`);
  return { status: "success", trxId: result.payment.trx_id };
}
