import { test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma.js";
import { getDemoContext } from "./demo-helpers.js";

test("demo seed creates workspace, matter, exhibits, and risk assessment", async () => {
  const ctx = await getDemoContext();

  const exhibits = await prisma.exhibit.findMany({
    where: { workspaceId: ctx.workspaceId }
  });
  assert.ok(exhibits.length >= 3, "Expected at least 3 exhibits");

  const hasPdf = exhibits.some((exhibit) => exhibit.mimeType === "application/pdf");
  const hasVideo = exhibits.some((exhibit) => exhibit.mimeType?.startsWith("video/"));
  const hasAudio = exhibits.some((exhibit) => exhibit.mimeType?.startsWith("audio/"));
  const hasWebCapture = exhibits.some((exhibit) => String(exhibit.type) === "WEB_CAPTURE");

  assert.ok(hasPdf, "Expected a PDF exhibit");
  assert.ok(hasVideo, "Expected a video exhibit");
  assert.ok(hasAudio, "Expected an audio exhibit");
  assert.ok(hasWebCapture, "Expected a web capture exhibit");

  const transcriptSegments = await prisma.transcriptSegment.findMany({
    where: { exhibitId: exhibits.find((exhibit) => exhibit.mimeType?.startsWith("video/"))?.id || "" }
  });
  assert.ok(transcriptSegments.length >= 1, "Expected transcript segments for video exhibit");

  const riskAssessments = await prisma.riskAssessment.findMany({
    where: { workspaceId: ctx.workspaceId }
  });
  assert.ok(riskAssessments.length >= 1, "Expected at least one risk assessment");
});
