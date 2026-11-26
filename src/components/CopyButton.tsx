"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function CopyButton({ value }: { value: string }) {
  const t = useTranslations("pay");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      // 44px tall: copying the bKash number is a real step in paying.
      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line bg-surface px-4 text-[13px] font-semibold text-accent-ink"
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
