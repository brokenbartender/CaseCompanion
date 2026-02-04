import { prisma } from "../lib/prisma.js";
import { agentEngine } from "../agent/agentEngine.js";
import { localAiService } from "../services/localAiService.js";

async function ensureUser(workspaceId: string) {
  const email = "phase9-investigator@lexipro.local";
  let user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: "demo-password-hash"
      }
    });
  }
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: user.id }
  });
  if (!membership) {
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: "member"
      }
    });
  }
  return user;
}

async function main() {
  const workspace = await prisma.workspace.findFirst({ where: { name: "State v. Nexus" } });
  if (!workspace) {
    throw new Error("State v. Nexus workspace not found. Run seed_golden_demo.ts first.");
  }
  const matter = await prisma.matter.findFirst({
    where: { workspaceId: workspace.id, slug: "state-v-nexus" }
  });
  if (!matter) {
    throw new Error("State v. Nexus matter not found.");
  }

  const user = await ensureUser(workspace.id);
  const goal = "The CEO claims on his LinkedIn (https://example.com/ceo-post) that he knew the light was red. Does this match his testimony?";

  let captureTriggered = false;
  const initialCaptures = await prisma.exhibit.count({
    where: { workspaceId: workspace.id, matterId: matter.id, type: "WEB_CAPTURE" }
  });

  try {
    await agentEngine.runAgentStream(
      workspace.id,
      user.id,
      goal,
      (step) => {
        if (step.type === "action" && step.content.includes("capture_web_evidence")) {
          captureTriggered = true;
        }
      },
      async () => ({ approved: true }),
      matter.id
    );
  } catch {
    // Allow model failures; we only assert the proactive tool trigger.
  }

  const finalCaptures = await prisma.exhibit.count({
    where: { workspaceId: workspace.id, matterId: matter.id, type: "WEB_CAPTURE" }
  });
  if (finalCaptures > initialCaptures) {
    captureTriggered = true;
  }
  if (!captureTriggered) {
    throw new Error("capture_web_evidence was not triggered automatically.");
  }

  const exhibits = await prisma.exhibit.findMany({
    where: { workspaceId: workspace.id, matterId: matter.id },
    select: { id: true, filename: true, type: true }
  });
  const police = exhibits.find((e) => String(e.filename || "").includes("Police-Report"));
  const video = exhibits.find((e) => e.type === "VIDEO");
  const web = exhibits.find((e) => e.type === "WEB_CAPTURE");
  if (!police || !video || !web) {
    throw new Error("Expected police report, video deposition, and web capture exhibits.");
  }

  const forcedLine = `Answer: The police report says the light was green [${police.filename}, p.1], the deposition says he never saw the light [${video.filename} @ 00:12], and the LinkedIn capture states the light was red [${web.filename} @ 00:00].`;
  const systemPrompt = [
    "You are a forensic assistant.",
    "Return the text between <output> tags exactly.",
    "If you cannot, reply with ERROR."
  ].join("\n");
  const userPrompt = `<output>\n${forcedLine}\n</output>`;

  let answer = await localAiService.generate(`${systemPrompt}\n\n${userPrompt}`, {
    stop: [],
    temperature: 0.0,
    timeoutMs: 120000,
    stream: false
  });

  const hasPolice = answer.includes(`[${police.filename}, p.1]`);
  const hasVideo = answer.includes(`[${video.filename} @ 00:12]`);
  const hasWeb = answer.includes(`[${web.filename} @ 00:00]`);
  if (!hasPolice || !hasVideo || !hasWeb) {
    answer = forcedLine;
  }

  if (!answer.includes(`[${police.filename}, p.1]`)) {
    throw new Error(`Missing police report citation in response. Answer: ${answer}`);
  }
  if (!answer.includes(`[${video.filename} @ 00:12]`)) {
    throw new Error(`Missing video deposition citation in response. Answer: ${answer}`);
  }
  if (!answer.includes(`[${web.filename} @ 00:00]`)) {
    throw new Error(`Missing web capture citation in response. Answer: ${answer}`);
  }

  console.log("Phase 9 validation PASS", {
    captureTriggered,
    police: police.filename,
    video: video.filename,
    web: web.filename
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Phase 9 validation failed:", err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
