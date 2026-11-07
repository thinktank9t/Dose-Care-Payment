import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getSession, isAdminSession } from "@/lib/auth/session";
import { getRepo } from "@/lib/data/repo";
import type { AdminFilter } from "@/lib/data/types";
import { formatBdt, formatDateTime, userReference } from "@/lib/format";
import { AdminPaymentActions } from "@/components/AdminPaymentActions";
import { StatusPill } from "@/components/StatusPill";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false, follow: false } };
}

const FILTERS: AdminFilter[] = ["pending", "verified", "rejected", "all"];

export default async function AdminPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as Locale;
  const { status } = await searchParams;

  const session = await getSession();
  if (!session) {
    redirect({ href: "/sign-in?next=%2Fadmin%2Fpayments", locale });
    return null;
  }
  const t = await getTranslations("admin");
  const tp = await getTranslations("plans");

  if (!(await isAdminSession(session))) {
    return (
      <div className="container-page py-14">
        <div className="card max-w-md p-7" data-testid="admin-forbidden">
          <h1 className="text-[26px]">{t("forbiddenTitle")}</h1>
          <p className="mt-3 text-ink-2">{t("forbiddenBody")}</p>
        </div>
      </div>
    );
  }

  const filter: AdminFilter = FILTERS.includes(status as AdminFilter) ? (status as AdminFilter) : "pending";
  const repo = await getRepo();
  const rows = await repo.listPaymentsForAdmin(filter);
  const filterLabel: Record<AdminFilter, string> = {
    pending: t("filterPending"),
    verified: t("filterVerified"),
    rejected: t("filterRejected"),
    all: t("filterAll"),
  };

  return (
    <div className="container-page py-12">
      <h1>{t("title")}</h1>
      <p className="mt-2 text-ink-2">{t("subtitle")}</p>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label={t("colStatus")}>
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/payments?status=${f}`}
            className={`pill h-9 px-4 text-[13px] ${f === filter ? "bg-accent-soft text-accent-ink" : "border border-line bg-surface text-ink-2"}`}
            aria-current={f === filter ? "page" : undefined}
          >
            {filterLabel[f]}
          </Link>
        ))}
        <span className="ml-auto self-center text-small text-ink-3">{t("count", { count: rows.length })}</span>
      </nav>

      <div className="card mt-5 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-6 text-ink-2">{t("empty")}</p>
        ) : (
          <table className="w-full min-w-[860px] border-collapse text-[14px]">
            <thead>
              <tr className="border-b border-line bg-bg-alt/60 text-left">
                <Th>{t("colUser")}</Th>
                <Th>{t("colPlan")}</Th>
                <Th>{t("colTrx")}</Th>
                <Th>{t("colSender")}</Th>
                <Th>{t("colAmount")}</Th>
                <Th>{t("colSubmitted")}</Th>
                <Th>{t("colStatus")}</Th>
                <Th>{t("colActions")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line align-top last:border-b-0" data-testid="admin-row" data-trx={p.trx_id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{p.user.name || "—"}</p>
                    <p className="text-small text-ink-2">{p.user.email ?? "—"}</p>
                    <p className="text-small text-ink-3">
                      {t("reference")} <span className="font-mono">{userReference(p.user.id)}</span>
                    </p>
                  </td>
                  <td className="px-4 py-3">{tp(p.plan_period)}</td>
                  <td className="px-4 py-3 font-mono tracking-wider">{p.trx_id}</td>
                  <td className="px-4 py-3 font-mono">{p.sender_number ?? "—"}</td>
                  <td className="px-4 py-3">{formatBdt(p.amount_bdt)}</td>
                  <td className="px-4 py-3 text-ink-2">{formatDateTime(p.created_at, locale)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={p.status} />
                    {p.verified_by ? (
                      <p className="mt-1 text-[12px] text-ink-3">
                        {t("reviewedBy", { email: p.verified_by })}
                        {p.verified_at ? ` · ${formatDateTime(p.verified_at, locale)}` : ""}
                      </p>
                    ) : null}
                    {p.note ? <p className="mt-1 text-[12px] text-ink-2">“{p.note}”</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "pending" ? <AdminPaymentActions paymentId={p.id} /> : <span className="text-ink-3">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="label-micro px-4 py-3 font-semibold">
      {children}
    </th>
  );
}
