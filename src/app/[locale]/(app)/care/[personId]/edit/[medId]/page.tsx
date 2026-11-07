"use client";

import { use } from "react";
import { MedicineForm } from "@/components/care/MedicineScreens";

export default function Page({ params }: { params: Promise<{ personId: string; medId: string }> }) {
  const { personId, medId } = use(params);
  return <MedicineForm personId={personId} existingId={medId} />;
}
