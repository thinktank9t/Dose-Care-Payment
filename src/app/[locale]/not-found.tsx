import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <div className="container-page flex justify-center py-20">
      <div className="card w-full max-w-md p-8 text-center">
        <p className="label-micro">404</p>
        <h1 className="mt-3 text-[28px]">{t("notFoundTitle")}</h1>
        <p className="mt-3 text-ink-2">{t("notFoundBody")}</p>
        <Link href="/" className="btn btn-primary mt-7">
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
