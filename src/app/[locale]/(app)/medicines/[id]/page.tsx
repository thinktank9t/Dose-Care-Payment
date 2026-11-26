"use client";

import { use } from "react";
import { MedicineDetail } from "@/components/care/MedicineScreens";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <MedicineDetail id={id} />;
}
