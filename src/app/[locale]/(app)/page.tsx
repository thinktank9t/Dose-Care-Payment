"use client";

import { Onboarding } from "@/components/care/Onboarding";
import { TodayScreen } from "@/components/care/TodayScreen";
import { useCare } from "@/components/care/store";

export default function HomePage() {
  const { ready, profile } = useCare();
  if (!ready) return <div className="min-h-svh" />;
  if (!profile.onboarded) return <Onboarding />;
  return <TodayScreen />;
}
