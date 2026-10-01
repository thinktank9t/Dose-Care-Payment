import { expect, test } from "@playwright/test";
import { expectedEndDate, formatEn, resetBackend, signInAs, signOut } from "./helpers";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await resetBackend(page);
  await signOut(page);
});

test("landing renders and the CTA leads to Get Premium", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Care for everyone");
  // Prices live in Supabase, which this suite does not serve: the pricing
  // section has to degrade to a message instead of taking the page down.
  await expect(page.locator("#pricing")).toContainText("couldn't load the plans");
  await page.getByTestId("cta-get-premium").click();
  await expect(page).toHaveURL(/\/en\/get-premium$/);
});

test("protected pages redirect to sign-in and back after Google sign-in", async ({ page }) => {
  await page.goto("/en/pay");
  await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fpay$/);
  await page.getByTestId("google-sign-in").click();
  await expect(page).toHaveURL(/\/en\/pay$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Get Premium");

  await page.goto("/en/account");
  await expect(page.getByTestId("plan-card")).toHaveAttribute("data-plan-status", "free");
  await expect(page.getByTestId("plan-title")).toHaveText("Free plan");
  await expect(page.getByTestId("plan-line")).toHaveCount(0);
});

test("submit TrxID → admin verify → account shows Premium with the right end date", async ({ page }) => {
  // 1. User submits a lowercase TrxID for the monthly plan.
  await signInAs(page, "user", "/en/pay?plan=monthly");
  await expect(page.getByTestId("plan-monthly")).toBeChecked();
  await page.getByTestId("trx-input").fill("abc123xy9z");
  await expect(page.getByTestId("trx-input")).toHaveValue("ABC123XY9Z");
  await page.getByTestId("sender-input").fill("01712345678");
  await page.getByTestId("submit-trx").click();
  await expect(page.getByTestId("submit-success")).toContainText("ABC123XY9Z");

  await page.goto("/en/account");
  const row = page.getByTestId("payment-row").filter({ hasText: "ABC123XY9Z" });
  await expect(row).toContainText("Pending");
  await expect(row).toContainText("Monthly");

  // 2. Duplicate TrxID is refused with a friendly message.
  await page.goto("/en/pay");
  await page.getByTestId("trx-input").fill("ABC123XY9Z");
  await page.getByTestId("submit-trx").click();
  await expect(page.getByTestId("submit-error")).toContainText("already been submitted");

  // 3. Admin verifies it.
  await signOut(page);
  await signInAs(page, "admin", "/en/admin/payments");
  const adminRow = page.getByTestId("admin-row").filter({ hasText: "ABC123XY9Z" });
  await expect(adminRow).toContainText("user@example.com");
  await adminRow.getByTestId("admin-note").fill("Matched statement");
  const before = new Date();
  await adminRow.getByTestId("admin-verify").click();
  await expect(adminRow).toHaveCount(0); // gone from the pending filter
  await page.goto("/en/admin/payments?status=verified");
  await expect(page.getByTestId("admin-row").filter({ hasText: "ABC123XY9Z" })).toContainText("admin@example.com");

  // 4. The user sees Premium, monthly, renewing one month from now.
  await signOut(page);
  await signInAs(page, "user", "/en/account");
  await expect(page.getByTestId("plan-card")).toHaveAttribute("data-plan-status", "active");
  await expect(page.getByTestId("plan-title")).toHaveText("Premium");
  await expect(page.getByTestId("plan-line")).toHaveText(`Monthly · Renews ${formatEn(expectedEndDate("monthly", before))}`);
  const verified = page.getByTestId("payment-row").filter({ hasText: "ABC123XY9Z" });
  await expect(verified).toContainText("Verified");
  await expect(verified).toContainText("Matched statement");

  // 5. Paying again stacks on the current end date.
  await page.goto("/en/pay?plan=yearly");
  await expect(page.getByText("adds a new period on top")).toBeVisible();
  await page.getByTestId("trx-input").fill("YEARLY0001");
  await page.getByTestId("submit-trx").click();
  await expect(page.getByTestId("submit-success")).toBeVisible();
  await signOut(page);
  await signInAs(page, "admin", "/en/admin/payments");
  await page.getByTestId("admin-row").filter({ hasText: "YEARLY0001" }).getByTestId("admin-verify").click();
  await signOut(page);
  await signInAs(page, "user", "/en/account");
  const stacked = expectedEndDate("yearly", expectedEndDate("monthly", before));
  await expect(page.getByTestId("plan-line")).toHaveText(`Yearly · Renews ${formatEn(stacked)}`);
});

test("non-admin cannot open the admin dashboard", async ({ page }) => {
  await signInAs(page, "user", "/en/admin/payments");
  await expect(page.getByTestId("admin-forbidden")).toBeVisible();
  await expect(page.getByTestId("admin-row")).toHaveCount(0);
});

test("language switch keeps the current page and query", async ({ page }) => {
  await page.goto("/en/sign-in?next=%2Fpay");
  await page.getByTestId("lang-bn").click();
  await expect(page).toHaveURL(/\/bn\/sign-in\?next=%2Fpay$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await expect(page.getByTestId("google-sign-in")).toHaveText("গুগল দিয়ে চালিয়ে যান");

  // The choice is remembered: an unprefixed URL now lands on /bn.
  await page.goto("/");
  await expect(page).toHaveURL(/\/bn$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("প্রিয়জনদের");

  await page.getByTestId("lang-en").click();
  await expect(page).toHaveURL(/\/en$/);
});

test("Bangla account page uses the app's plan strings", async ({ page }) => {
  await signInAs(page, "user", "/bn/account");
  await expect(page.getByText("আপনার প্ল্যান")).toBeVisible();
  await expect(page.getByTestId("plan-title")).toHaveText("ফ্রি প্ল্যান");
});

test("404 is localised", async ({ page }) => {
  const res = await page.goto("/bn/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("পাতাটি পাওয়া যায়নি");
});

test("the landing page routes an existing customer to the status check", async ({ page }) => {
  await page.goto("/en");
  await page.getByTestId("hero-check-status").click();
  await expect(page).toHaveURL(/\/en\/check-status$/);

  // And the card under the pricing cards goes to the same place.
  await page.goto("/en#pricing");
  await page.getByTestId("check-status-card").getByTestId("link-check-status").click();
  await expect(page).toHaveURL(/\/en\/check-status$/);
});

test("Get Premium links to the status check, which validates the email client-side", async ({ page }) => {
  await page.goto("/en/get-premium");
  await page.getByTestId("link-check-status").click();
  await expect(page).toHaveURL(/\/en\/check-status$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your Premium");

  // Supabase is not served to this suite, so only the client-side guards run:
  // a bad email must never reach the network.
  await page.getByTestId("status-submit").click();
  await expect(page.getByTestId("status-field-error")).toHaveText("Please enter your email.");

  await page.getByTestId("status-email").fill("not-an-email");
  await page.getByTestId("status-submit").click();
  await expect(page.getByTestId("status-field-error")).toHaveText("Please enter a valid email address.");
  await expect(page.getByTestId("status-result")).toHaveCount(0);
});
