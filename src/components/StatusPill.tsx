import { useTranslations } from "next-intl";
import type { PaymentStatus } from "@/lib/data/types";
import { Glyph } from "./Glyph";

const STYLES: Record<PaymentStatus, string> = {
  pending: "bg-pending-soft text-pending",
  verified: "bg-accent-soft text-accent-ink",
  rejected: "bg-danger-soft text-danger",
};

const GLYPH: Record<PaymentStatus, "clock" | "checkCircle" | "alertCircle"> = {
  pending: "clock",
  verified: "checkCircle",
  rejected: "alertCircle",
};

export function StatusPill({ status }: { status: PaymentStatus }) {
  const t = useTranslations("status");
  return (
    <span className={`pill ${STYLES[status]}`} data-status={status}>
      <Glyph name={GLYPH[status]} size={11} strokeWidth={1.8} />
      {t(status)}
    </span>
  );
}
