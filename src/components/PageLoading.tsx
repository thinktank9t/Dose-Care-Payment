"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "./Skeleton";
import { Spinner } from "./Spinner";

/**
 * Route-level loading UI, rendered by `loading.tsx` the moment a navigation
 * starts and torn down when the server has answered. It mirrors the usual page
 * shape — title, lead paragraph, a couple of cards — so the swap to real
 * content doesn't jump.
 *
 * Each data-backed route gets its own `loading.tsx`; there is deliberately no
 * boundary at `[locale]` itself. One there would also wrap the `[...rest]`
 * catch-all, and streaming the shell first commits a 200 before `notFound()`
 * runs — unknown paths would stop answering 404.
 */
export function PageLoading({ cards = 2 }: { cards?: number }) {
  const t = useTranslations("common");

  return (
    <div className="container-page py-12" role="status" aria-busy="true">
      <div className="max-w-2xl">
        <Skeleton className="h-9 w-2/3 sm:h-11" />
        <Skeleton className="mt-4 h-5 w-full" />
        <Skeleton className="mt-2 h-5 w-4/5" />

        <div className="mt-8 space-y-4">
          {Array.from({ length: cards }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>

        <p className="mt-8 flex items-center gap-2 text-small text-ink-3">
          <Spinner size={15} />
          {t("loading")}
        </p>
      </div>
    </div>
  );
}
