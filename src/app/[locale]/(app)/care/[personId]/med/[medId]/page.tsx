"use client";

import { use } from "react";
import { MedicineDetail } from "@/components/care/MedicineScreens";

export default function Page({ params }: { params: Promise<{ personId: string; medId: string }> }) {
  const { personId, medId } = use(params);
  return <MedicineDetail id={medId} personId={personId} />;
}
