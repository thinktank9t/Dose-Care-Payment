"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { MED_COLORS, isPast } from "@/lib/care/schedule";
import type { MedColor, MedForm, ScheduledDose } from "@/lib/care/types";

/**
 * Today's flag for a dose that was not taken. "Late" while it can still be
 * taken (matches the overdue banner), "Skipped" when the user chose to skip.
 * "Missed" is kept for past days in History. Each carries a glyph so the
 * state is not shown by color alone.
 */
export function DoseFlag({ dose, className = "" }: { dose: ScheduledDose; className?: string }) {
  const t = useTranslations("care");
  if (dose.status === "skipped") {
    return (
      <span className={`pill bg-bg-alt text-ink-2 ${className}`}>
        <Icon name="close" size={11} strokeWidth={1.8} />
        {t("today.skipped")}
      </span>
    );
  }
  if (dose.status === "due" && isPast(dose.date, dose.time, new Date())) {
    return (
      <span className={`pill bg-warn-soft text-warn ${className}`}>
        <Icon name="clock" size={12} strokeWidth={1.8} />
        {t("today.late")}
      </span>
    );
  }
  return null;
}

export function Icon({
  name,
  size = 22,
  strokeWidth = 1.6,
}: {
  name:
    | "sun"
    | "pill"
    | "capsule"
    | "drop"
    | "syringe"
    | "users"
    | "user"
    | "plus"
    | "bell"
    | "battery"
    | "chevron"
    | "check"
    | "close"
    | "clock"
    | "calendar"
    | "back"
    | "gear"
    | "moon"
    | "contrast"
    | "star"
    | "hearts"
    | "snooze"
    | "alert";
  size?: number;
  strokeWidth?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  return (
    <svg {...common}>
      {name === "sun" && (
        <>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3.2v1.8M12 19v1.8M3.2 12H5M19 12h1.8M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M18.4 5.6l-1.3 1.3M6.9 17.1l-1.3 1.3" />
        </>
      )}
      {name === "pill" && <path d="M8.2 15.8 15.8 8.2a3.1 3.1 0 0 1 4.4 4.4l-7.6 7.6a3.1 3.1 0 0 1-4.4-4.4Z M10.2 10.2l3.6 3.6" />}
      {name === "capsule" && (
        <>
          <rect x="4.2" y="8.2" width="15.6" height="7.6" rx="3.8" transform="rotate(-35 12 12)" />
          <path d="M9.2 14.6 14.8 9.2" />
        </>
      )}
      {name === "drop" && <path d="M12 3.5s5 5.4 5 8.6a5 5 0 0 1-10 0c0-3.2 5-8.6 5-8.6Z" />}
      {name === "syringe" && (
        <>
          <path d="m14.2 5.2 4.6 4.6M16.5 3.5l4 4M5.2 14.8 14 6M4 20l4.2-1.2L18 9.2" />
        </>
      )}
      {name === "users" && (
        <>
          <circle cx="9" cy="9" r="2.4" />
          <circle cx="16" cy="10" r="2" />
          <path d="M4.8 18.2c.6-2.3 2.3-3.5 4.2-3.5s3.6 1.2 4.2 3.5M14 14.8c1.3-.3 2.6.1 3.4 1.1.7.8 1 1.7 1.2 2.3" />
        </>
      )}
      {name === "user" && (
        <>
          <circle cx="12" cy="8.5" r="2.7" />
          <path d="M6.2 18.4c.8-2.6 2.8-3.9 5.8-3.9s5 1.3 5.8 3.9" />
        </>
      )}
      {name === "plus" && <path d="M12 5.5v13M5.5 12h13" />}
      {name === "bell" && (
        <>
          <path d="M6.2 16.5h11.6l-1.1-1.6V11a4.7 4.7 0 0 0-9.4 0v3.9L6.2 16.5Z" />
          <path d="M10 16.6a2 2 0 0 0 4 0" />
        </>
      )}
      {name === "battery" && (
        <>
          <rect x="3.5" y="8" width="15" height="8" rx="2" />
          <path d="M18.5 10.5H20a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-1.5M6.2 12h4" />
        </>
      )}
      {name === "chevron" && <path d="m9 6 6 6-6 6" />}
      {name === "check" && <path d="m5.5 12.5 4 4 9-9" />}
      {name === "close" && <path d="m7 7 10 10M17 7 7 17" />}
      {name === "clock" && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.5l2.6 1.6" />
        </>
      )}
      {name === "calendar" && (
        <>
          <rect x="4" y="5.5" width="16" height="14" rx="2" />
          <path d="M8 3.8v3.2M16 3.8v3.2M4 10h16" />
        </>
      )}
      {name === "back" && <path d="M15 5.5 8.5 12 15 18.5" />}
      {name === "gear" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.8v2.1M12 18.1v2.1M3.8 12h2.1M18.1 12h2.1M6.2 6.2l1.5 1.5M16.3 16.3l1.5 1.5M17.8 6.2l-1.5 1.5M7.7 16.3l-1.5 1.5" />
        </>
      )}
      {name === "moon" && <path d="M15.5 4.8A7.2 7.2 0 1 0 19 15.2 5.6 5.6 0 0 1 15.5 4.8Z" />}
      {name === "contrast" && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v16" />
        </>
      )}
      {name === "star" && <path d="m12 4.2 1.8 4.2 4.6.5-3.4 3.1.9 4.5L12 14.4 8.1 16.5l.9-4.5L5.6 8.9l4.6-.5L12 4.2Z" />}
      {name === "hearts" && (
        <>
          <circle cx="9" cy="10" r="2.2" />
          <circle cx="15" cy="10" r="2.2" />
          <path d="M7.2 16.8c.5-2 1.8-3 3.3-3 .8 0 1.5.2 2 .7.5-.5 1.2-.7 2-.7 1.5 0 2.8 1 3.3 3" />
        </>
      )}
      {name === "snooze" && (
        <>
          <circle cx="12" cy="13" r="7" />
          <path d="M12 10v3.2l2.2 1.4M9 4.5h4.2L9 8h4.2" />
        </>
      )}
      {name === "alert" && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4.4M12 16h.01" />
        </>
      )}
    </svg>
  );
}

export function MedGlyph({
  form,
  color,
  size = 44,
}: {
  form: MedForm;
  color: MedColor;
  size?: number;
}) {
  const tint = MED_COLORS[color];
  const icon = form === "capsule" ? "capsule" : form === "liquid" ? "drop" : form === "injection" ? "syringe" : "pill";
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: tint.bg, color: tint.fg }}
    >
      <Icon name={icon} size={Math.round(size * 0.46)} />
    </span>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const t = useTranslations("care");
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(15,28,36,0.46)] p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[min(86svh,720px)] w-full max-w-md overflow-y-auto rounded-3xl bg-surface p-6 shadow-[0_16px_40px_rgba(15,28,36,0.16)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          {title ? <h2 className="text-[22px]">{title}</h2> : <span />}
          <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-alt text-ink" onClick={onClose} aria-label={t("common.close")}>
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full border border-line transition-colors ${on ? "bg-accent" : "bg-bg-alt"}`}
    >
      <span
        className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-surface transition-all ${on ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="flex rounded-xl bg-bg-alt p-1" role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-11 flex-1 rounded-[9px] px-2 text-[14px] ${
              active ? "bg-accent-soft font-medium text-accent-ink" : "text-ink-2"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ScreenHeader({
  title,
  eyebrow,
  onBack,
  action,
}: {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  action?: React.ReactNode;
}) {
  const t = useTranslations("care");
  return (
    <header className="flex items-center gap-3 px-1 py-2">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink"
          aria-label={t("common.back")}
        >
          <Icon name="back" size={22} />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="label-micro">{eyebrow}</p> : null}
        <h1 className="text-[26px] leading-tight">{title}</h1>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-accent-soft text-accent">{icon}</div>
      <h2 className="text-[22px]">{title}</h2>
      <p className="mt-2 max-w-[32ch] text-ink-2">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
