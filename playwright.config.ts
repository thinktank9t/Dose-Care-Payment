import { defineConfig, devices } from "@playwright/test";

const PORT = 3123;
const baseURL = `http://localhost:${PORT}`;

/**
 * The suite runs against a production build with the in-memory fake backend
 * (E2E_FAKE_BACKEND=1) so it needs neither Google OAuth nor a database.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 780 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `${baseURL}/en`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      E2E_FAKE_BACKEND: "1",
      NEXT_PUBLIC_SITE_URL: baseURL,
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
      NEXT_PUBLIC_PRICE_MONTHLY_BDT: "550",
      NEXT_PUBLIC_PRICE_YEARLY_BDT: "4100",
      NEXT_PUBLIC_BKASH_NUMBER: "01700000000",
      NEXT_PUBLIC_SUPPORT_EMAIL: "support@example.com",
    },
  },
});
