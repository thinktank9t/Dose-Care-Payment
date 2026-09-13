"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { reviewPayment, type AdminActionState } from "@/lib/actions/admin";

export function AdminPaymentActions({ paymentId }: { paymentId: string }) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState<AdminActionState, FormData>(reviewPayment, {
    status: "idle",
  });

  const message = (() => {
    if (state.status === "done") {
      if (!state.changed) return t("doneNoop");
      return state.action === "verify" ? t("doneVerified") : t("doneRejected");
    }
    if (state.status === "error") {
      return state.error === "forbidden" ? t("errForbidden") : state.error === "invalid" ? t("errInvalid") : t("errUnknown");
    }
    return null;
  })();

  return (
    <form action={action} className="flex w-56 flex-col gap-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input
        name="note"
        maxLength={500}
        placeholder={t("notePlaceholder")}
        className="field h-10 rounded-xl text-[13px]"
        data-testid="admin-note"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          name="action"
          value="verify"
          disabled={pending}
          className="btn btn-primary btn-sm flex-1"
          data-testid="admin-verify"
        >
          {pending ? t("working") : t("verify")}
        </button>
        <button
          type="submit"
          name="action"
          value="reject"
          disabled={pending}
          className="btn btn-danger btn-sm flex-1"
          data-testid="admin-reject"
        >
          {t("reject")}
        </button>
      </div>
      {message ? (
        <p role="status" className="text-[12px] text-ink-2" data-testid="admin-result">
          {message}
        </p>
      ) : null}
    </form>
  );
}
