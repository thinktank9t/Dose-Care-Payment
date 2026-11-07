import { expect, test } from "@playwright/test";

/**
 * The language lives in the URL, so every history entry carries the language it
 * was visited in. These cover what that costs: once the reader picks a
 * language it has to stay picked, including on the way back through pages
 * visited before the switch — and a link someone shared has to keep its own.
 */

test("the chosen language survives Back", async ({ page }) => {
  await page.goto("/en/get-premium");
  await page.getByTestId("lang-bn").click();
  await expect(page).toHaveURL(/\/bn\/get-premium$/);

  await page.getByTestId("link-check-status").click();
  await expect(page).toHaveURL(/\/bn\/check-status$/);

  await page.getByTestId("lang-en").click();
  await expect(page).toHaveURL(/\/en\/check-status$/);

  // Back returns to the earlier entry, whose URL still says Bangla. The guard
  // rewrites it to the language the reader just chose.
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/get-premium$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("the query string survives the correction", async ({ page }) => {
  await page.goto("/bn/sign-in?next=%2Fpay");
  await page.getByTestId("nav-get-premium").click();
  await expect(page).toHaveURL(/\/bn\/get-premium$/);

  await page.getByTestId("lang-en").click();
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/sign-in\?next=%2Fpay$/);
});

test("Back is corrected at every step, not just the first", async ({ page }) => {
  await page.goto("/bn/profile");
  await page.getByTestId("nav-get-premium").click();
  await expect(page).toHaveURL(/\/bn\/get-premium$/);
  await page.getByTestId("link-check-status").click();
  await expect(page).toHaveURL(/\/bn\/check-status$/);

  await page.getByTestId("lang-en").click();
  await expect(page).toHaveURL(/\/en\/check-status$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/en\/get-premium$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/profile$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("switching to Bangla is not undone by the guard", async ({ page }) => {
  await page.goto("/en/get-premium");
  await page.getByTestId("lang-bn").click();
  await expect(page).toHaveURL(/\/bn\/get-premium$/);

  await page.getByTestId("tab-profile").click();
  await expect(page).toHaveURL(/\/bn\/profile$/);
  await page.waitForTimeout(500);
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
});

test("a shared Bangla link opens in Bangla", async ({ page }) => {
  // Nobody has touched the switcher, so there is no choice to enforce.
  await page.goto("/bn/get-premium");
  await page.waitForTimeout(700);
  await expect(page).toHaveURL(/\/bn\/get-premium$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
});
