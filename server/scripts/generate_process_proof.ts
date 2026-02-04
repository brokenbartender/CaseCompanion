import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const baseUrl = process.env.PROOF_BASE_URL || "http://localhost:3001";
  const workspace = await prisma.workspace.findFirst({ where: { name: "State v. Nexus" } });
  if (!workspace) throw new Error("State v. Nexus workspace not found");
  const matter = await prisma.matter.findFirst({ where: { workspaceId: workspace.id, slug: "state-v-nexus" } });
  if (!matter) throw new Error("State v. Nexus matter not found");

  const snapshotDir = fs.existsSync(path.join(process.cwd(), "server"))
    ? path.join(process.cwd(), "server", "exhibit_snapshots")
    : path.join(process.cwd(), "exhibit_snapshots");
  if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(({ workspaceId }) => {
    sessionStorage.setItem("workspace_id", workspaceId);
    sessionStorage.setItem("workspace_role", "admin");
  }, { workspaceId: workspace.id });

  const page = await context.newPage();

  page.setDefaultTimeout(15000);
  await page.goto(`${baseUrl}/admissibility`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(snapshotDir, "step1_source_conflict.png"), fullPage: true });

  await page.goto(`${baseUrl}/assistant`, { waitUntil: "domcontentloaded" });
  try {
    await page.waitForSelector("#case-assistant-exhibit", { timeout: 15000 });
    const options = await page.locator("#case-assistant-exhibit option").all();
    const optionValues = await Promise.all(options.map(async (opt) => ({
      value: await opt.getAttribute("value"),
      text: await opt.textContent()
    })));
    const videoOption = optionValues.find((opt) => (opt.text || "").toLowerCase().includes(".mp4"));
    if (videoOption?.value) {
      await page.selectOption("#case-assistant-exhibit", videoOption.value);
    }
    const transcriptButton = page.locator("button").filter({ hasText: /s–|s-/ }).first();
    if (await transcriptButton.count()) {
      await transcriptButton.click();
      await page.waitForTimeout(800);
    }
  } catch {
    // Continue even if UI controls are not ready.
  }
  await page.screenshot({ path: path.join(snapshotDir, "step2_video_teleport.png"), fullPage: true });

  try {
    const options = await page.locator("#case-assistant-exhibit option").all();
    const optionValues = await Promise.all(options.map(async (opt) => ({
      value: await opt.getAttribute("value"),
      text: await opt.textContent()
    })));
    const webOption = optionValues.find((opt) => (opt.text || "").toLowerCase().includes(".png"));
    if (webOption?.value) {
      await page.selectOption("#case-assistant-exhibit", webOption.value);
      await page.waitForTimeout(800);
    }
  } catch {
    // Ignore selection failures.
  }
  await page.screenshot({ path: path.join(snapshotDir, "step3_web_witness.png"), fullPage: true });

  await page.goto(`${baseUrl}/roi`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(snapshotDir, "step4_roi_calculator.png"), fullPage: true });

  await browser.close();
  console.log("Process proof screenshots saved to", snapshotDir);
}

main()
  .catch((err) => {
    console.error("Process proof generation failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
