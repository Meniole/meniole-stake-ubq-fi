import { expect, test } from "@playwright/test";

test("renders landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});