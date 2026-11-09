import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const bangla = locale === "bn";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Asia/Dhaka",
    // Named formats so `{count, number, integer}` and `#` in plurals can
    // render Bengali digits when the UI is in Bangla.
    formats: {
      number: {
        integer: {
          maximumFractionDigits: 0,
          ...(bangla ? { numberingSystem: "beng" as const } : null),
        },
        percent: {
          style: "percent" as const,
          maximumFractionDigits: 0,
          ...(bangla ? { numberingSystem: "beng" as const } : null),
        },
      },
      dateTime: {
        short: {
          day: "numeric" as const,
          month: "short" as const,
          year: "numeric" as const,
          timeZone: "Asia/Dhaka",
          ...(bangla ? { numberingSystem: "beng" as const } : null),
        },
      },
    },
  };
});
