import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// CONFIG
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5173';
const OUTPUT_DIR = 'release_artifacts/v1.2.0_Diligence_Pack/visuals';
const VIDEO_DIR = path.join(OUTPUT_DIR, 'video');
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'screenshots');

// Ensure dirs exist
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

(async () => {
  console.log(` Starting Smart Capture on ${TARGET_URL}...`);
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  // 1. INJECT ADMIN ROLE (Critical: Prevents Redirect)
  await page.addInitScript(() => {
    // Match app storage keys to avoid redirect.
    window.sessionStorage.setItem('workspace_role', 'admin');
    window.sessionStorage.setItem('workspace_id', 'lexis-workspace-01');
    window.sessionStorage.setItem('lexipro_demo_mode', '1');
    window.sessionStorage.setItem('lexipro_demo_env', '1');
    // Force cinematic pacing
    window.__DEMO_PACING_MS = 3000; 
  });

  // 2. NAVIGATE & START
  console.log("?? Loading Demo...");
  await page.goto(`${TARGET_URL}/demo?autoplay=1`, { waitUntil: 'domcontentloaded' });

  // 3. EVENT-DRIVEN EXECUTION (Smart Network Waits)
  
  // Wait for Ingestion to START
  console.log("? Waiting for Ingestion API...");
  await page.waitForResponse(resp => (
    (resp.url().includes('/api/demo/seed') ||
     resp.url().includes('/api/intake/upload') ||
     (resp.url().includes('/api/workspaces/') && resp.url().includes('/exhibits')))
    && resp.status() === 200
  ), { timeout: 60000 });
  console.log("? Ingestion Complete.");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_ingestion_complete.png') });

  // Wait for Analysis to FINISH
  console.log("? Waiting for Forensic Analysis...");
  await page.waitForResponse(resp => (
    (resp.url().includes('/api/ai/chat') ||
     resp.url().includes('/api/aigis/chat') ||
     (resp.url().includes('/api/workspaces/') && resp.url().includes('/anchors')))
    && resp.status() === 200
  ), { timeout: 90000 });
  console.log("? Analysis Complete.");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_analysis_complete.png') });

  // Wait for Packet Generation
  console.log("? Waiting for Proof Packet...");
  await page.waitForResponse(resp => (
    (resp.url().includes('/api/audit') ||
     resp.url().includes('/api/security/audit') ||
     resp.url().includes('/api/audit/recent') ||
     (resp.url().includes('/api/workspaces/') && resp.url().includes('/audit')))
    && resp.status() === 200
  ), { timeout: 60000 });
  console.log("? Packet Generated.");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_packet_ready.png') });

  // 4. CLEANUP
  console.log(" Saving Video...");
  await context.close();
  await browser.close();
  console.log(` Capture Finished. Video saved to ${VIDEO_DIR}`);
})();
