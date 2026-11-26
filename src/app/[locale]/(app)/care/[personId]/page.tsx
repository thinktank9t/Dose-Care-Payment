"use client";

import { use } from "react";
import { PersonScreen } from "@/components/care/CareScreens";

export default function Page({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  return <PersonScreen personId={personId} />;
}
