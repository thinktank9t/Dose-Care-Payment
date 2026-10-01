import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { siteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const paths = ["", "/get-premium", "/check-status", "/privacy", "/terms", "/refund-policy"];
  return locales.flatMap((l) => paths.map((p) => ({ url: `${base}/${l}${p}`, changeFrequency: "monthly" as const })));
}
