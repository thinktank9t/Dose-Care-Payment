import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/next-path";
import { signInWithGoogle } from "@/lib/actions/auth";
import { GoogleMark } from "@/components/GoogleMark";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("signIn");
  return { title: t("title") };
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next: rawNext, error } = await searchParams;
  const next = safeNextPath(rawNext);

  if (await getSession()) {
    redirect({ href: next, locale });
  }

  const t = await getTranslations("signIn");

  return (
    <div className="container-page flex justify-center py-14">
      <div className="card w-full max-w-md p-7 sm:p-9">
        <h1 className="text-[28px]">{t("title")}</h1>
        <p className="mt-3 text-ink-2">{t("subtitle")}</p>

        {error === "oauth" ? (
          <p role="alert" className="mt-5 rounded-2xl bg-danger-soft px-4 py-3 text-small text-danger">
            {t("errorOauth")}
          </p>
        ) : null}

        <form action={signInWithGoogle} className="mt-7">
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="btn btn-primary w-full" data-testid="google-sign-in">
            <GoogleMark />
            {t("button")}
          </button>
        </form>

        <p className="mt-5 text-small text-ink-2">{t("note")}</p>
        <p className="mt-3 text-small text-ink-2">
          {t.rich("legal", {
            terms: (chunks) => (
              <Link href="/terms" className="underline">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
