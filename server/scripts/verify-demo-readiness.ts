import { prisma } from "../lib/prisma.js";

async function main() {
  const workspace = await prisma.workspace.findFirst({ where: { name: "M&A Green Run" } });
  if (!workspace) {
    throw new Error("Workspace 'M&A Green Run' not found.");
  }

  const videoExhibits = await prisma.exhibit.findMany({
    where: { workspaceId: workspace.id, type: "VIDEO" },
    select: { id: true, filename: true }
  });
  if (!videoExhibits.length) {
    throw new Error("No video exhibits found for M&A Green Run.");
  }

  const anchor = await prisma.anchor.findUnique({ where: { id: "anchor-green-run-001" } });
  if (!anchor) {
    throw new Error("Demo anchor anchor-green-run-001 not found.");
  }

  const assessments = await prisma.riskAssessment.findMany({
    where: { workspaceId: workspace.id },
    select: { redlineSuggestion: true }
  });
  const citationPattern = /@\s*\d{1,2}:\d{2}/;
  const hasMediaCitation = assessments.some((a) => citationPattern.test(String(a.redlineSuggestion || "")));
  if (!hasMediaCitation) {
    throw new Error("No risk assessment contains media citation timestamps.");
  }

  console.log("Golden demo readiness PASS", {
    workspaceId: workspace.id,
    videoExhibits: videoExhibits.length,
    anchorId: anchor.id,
    riskAssessments: assessments.length
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Golden demo readiness failed:", err?.message || err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
