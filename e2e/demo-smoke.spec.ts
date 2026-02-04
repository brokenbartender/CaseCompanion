import { test, expect } from "@playwright/test";

const DEMO_TIMEOUT = 240_000;

test("demo director reaches complete state with proof beats", async ({ page }) => {
  test.setTimeout(DEMO_TIMEOUT);
  const consoleLogs: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    pageErrors.push(String(err));
  });
  await page.addInitScript(() => {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith("lexipro_demo_stage_"))
      .forEach((key) => sessionStorage.removeItem(key));
  });
  await page.goto("/demo?autoplay=1", { waitUntil: "domcontentloaded" });

  const waitForStage = async (stage: string) => {
    await page.waitForFunction(
      (key) => sessionStorage.getItem(key) === "done",
      `lexipro_demo_stage_${stage}`,
      { timeout: 120_000 }
    );
  };

  const stages = ["preflight", "seeding", "intake", "teleport", "withheld", "audit", "export", "complete"];
  try {
    for (const stage of stages) {
      await waitForStage(stage);
    }
  } catch {
    const values = await page.evaluate((stageList) => {
      const result: Record<string, string | null> = {};
      stageList.forEach((stage) => {
        result[stage] = sessionStorage.getItem(`lexipro_demo_stage_${stage}`);
      });
      return result;
    }, stages);
    const location = await page.evaluate(() => window.location.href);
    const demoError = await page.evaluate(() => sessionStorage.getItem("lexipro_demo_error") || "");
    const auditId = await page.evaluate(() => sessionStorage.getItem("lexipro_demo_withheld_audit") || "");
    console.log("Demo smoke diagnostics:");
    console.log(`- location: ${location}`);
    console.log(`- auditEventId: ${auditId || "none"}`);
    console.log(`- demo error: ${demoError || "none"}`);
    console.log(`- page errors: ${pageErrors.length ? pageErrors.join(" | ") : "none"}`);
    if (consoleLogs.length) {
      console.log("- console logs:");
      consoleLogs.slice(-30).forEach((line) => console.log(`  ${line}`));
    } else {
      console.log("- console logs: none");
    }
    const missing = Object.entries(values)
      .filter(([, value]) => value !== "done")
      .map(([stage, value]) => `${stage}:${value ?? "null"}`)
      .join(", ");
    throw new Error(`Demo stage timeout. Missing or incomplete stages: ${missing}`);
  }

  const auditEventId = await page.evaluate(() => sessionStorage.getItem("lexipro_demo_withheld_audit") || "");
  expect(auditEventId).not.toEqual("");

  await expect(page.getByText("Demo complete", { exact: false })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Download Proof Packet Again" })).toBeVisible();
});
