"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function CopyButton({ value }: { value: string }) {
  const t = useTranslations("pay");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-ink"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard unavailable (older browsers / insecure context): no-op.
        }
      }}
      aria-live="polite"
    >
      {copied ? t("copied") : t("copy")}
    </button>
  );
}
