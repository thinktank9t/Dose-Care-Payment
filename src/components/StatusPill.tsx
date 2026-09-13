import { useTranslations } from "next-intl";
import type { PaymentStatus } from "@/lib/data/types";

const STYLES: Record<PaymentStatus, string> = {
  pending: "bg-warn-soft text-warn",
  verified: "bg-accent-soft text-accent-ink",
  rejected: "bg-danger-soft text-danger",
};

export function StatusPill({ status }: { status: PaymentStatus }) {
  const t = useTranslations("status");
  return (
    <span className={`pill ${STYLES[status]}`} data-status={status}>
      {t(status)}
    </span>
  );
}
