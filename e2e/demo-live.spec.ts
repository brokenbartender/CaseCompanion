import { test, expect } from "@playwright/test";

test("login live demo launches mock contract dispute scenario", async ({ page }) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  const demoButton = page.getByTestId("btn-live-demo");
  await expect(demoButton).toBeVisible({ timeout: 15000 });

  await demoButton.click();
  await page.waitForURL(/assistant/);

  const mockFlag = await page.evaluate(() => sessionStorage.getItem("lexipro_demo_mock"));
  expect(mockFlag).toBe("1");

  await expect(page.getByTestId("contract-demo-pack")).toBeVisible();
});
