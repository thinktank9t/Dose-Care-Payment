"use client";

import { use } from "react";
import { MedicineForm } from "@/components/care/MedicineScreens";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MedicineForm existingId={id} />;
}
