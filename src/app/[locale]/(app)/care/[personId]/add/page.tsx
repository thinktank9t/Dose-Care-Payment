"use client";

import { use } from "react";
import { MedicineForm } from "@/components/care/MedicineScreens";

export default function Page({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  return <MedicineForm personId={personId} />;
}
