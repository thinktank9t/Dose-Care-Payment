"use client";

import { use } from "react";
import { PrescriptionView } from "@/components/care/PrescriptionScreens";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PrescriptionView id={id} />;
}
