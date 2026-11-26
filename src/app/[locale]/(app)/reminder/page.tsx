"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ReminderScreen } from "@/components/care/ReminderScreen";

function ReminderRoute() {
  const search = useSearchParams();
  return <ReminderScreen medId={search.get("med") ?? undefined} time={search.get("time") ?? undefined} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-svh bg-accent" />}>
      <ReminderRoute />
    </Suspense>
  );
}
