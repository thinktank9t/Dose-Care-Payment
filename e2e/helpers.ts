import type { Page } from "@playwright/test";

export async function resetBackend(page: Page) {
  const res = await page.request.get("/auth/fake?reset=1");
  if (!res.ok()) throw new Error(`reset failed: ${res.status()}`);
}

export async function signInAs(page: Page, as: "user" | "admin", next = "/en/account") {
  await page.goto(`/auth/fake?as=${as}&next=${encodeURIComponent(next)}`);
}

export async function signOut(page: Page) {
  await page.context().clearCookies();
}

/** Same rule as activate_premium(): +1 month / +1 year from now. */
export function expectedEndDate(period: "monthly" | "yearly", from = new Date()): Date {
  const d = new Date(from);
  if (period === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function formatEn(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Dhaka" }).format(date);
}
