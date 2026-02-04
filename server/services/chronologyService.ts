import { prisma } from "../lib/prisma.js";

export type UnifiedTimelineEvent = {
  id: string;
  date: string;
  type: "EVIDENCE" | "DEADLINE" | "TESTIMONY";
  label: string;
  status?: string | null;
  exhibitId?: string | null;
  startTime?: number | null;
};

function toIso(date: Date) {
  return date.toISOString();
}

function snippet(text: string, max = 120) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export async function getUnifiedTimeline(matterId: string): Promise<UnifiedTimelineEvent[]> {
  const [exhibits, deadlines, transcriptSegments] = await Promise.all([
    prisma.exhibit.findMany({
      where: { matterId },
      select: { id: true, filename: true, createdAt: true }
    }),
    prisma.deadline.findMany({
      where: { matterId },
      select: { id: true, title: true, dueDate: true, status: true }
    }),
    prisma.transcriptSegment.findMany({
      where: { exhibit: { matterId } },
      orderBy: [{ exhibitId: "asc" }, { startTime: "asc" }],
      distinct: ["exhibitId"],
      include: { exhibit: { select: { id: true, createdAt: true } } }
    })
  ]);

  const evidenceEvents: UnifiedTimelineEvent[] = exhibits.map((exhibit: any) => ({
    id: `exhibit:${exhibit.id}`,
    date: toIso(exhibit.createdAt),
    type: "EVIDENCE",
    label: exhibit.filename || "Untitled Exhibit",
    exhibitId: exhibit.id
  }));

  const deadlineEvents: UnifiedTimelineEvent[] = deadlines.map((deadline: any) => ({
    id: `deadline:${deadline.id}`,
    date: toIso(deadline.dueDate),
    type: "DEADLINE",
    label: deadline.title || "Deadline",
    status: deadline.status,
  }));

  const testimonyEvents: UnifiedTimelineEvent[] = transcriptSegments.map((segment: any) => {
    const base = segment.exhibit?.createdAt ? segment.exhibit.createdAt.getTime() : Date.now();
    const offsetMs = Math.max(0, Number(segment.startTime || 0) * 1000);
    return {
      id: `transcript:${segment.id}`,
      date: toIso(new Date(base + offsetMs)),
      type: "TESTIMONY",
      label: snippet(segment.text),
      exhibitId: segment.exhibitId,
      startTime: segment.startTime
    };
  });

  return [...evidenceEvents, ...deadlineEvents, ...testimonyEvents]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

