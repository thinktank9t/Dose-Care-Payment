"use client";

import { use } from "react";
import { HistoryDay } from "@/components/care/HistoryScreens";

export default function Page({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params);
  return <HistoryDay date={date} />;
}
