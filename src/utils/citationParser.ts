export type CitationSegment =
  | { type: "text"; value: string }
  | { type: "doc"; label: string; page: number; raw: string }
  | { type: "media"; label: string; seconds: number; raw: string };

const mediaPattern = /\[([^\]@]+?)\s*@\s*(\d{1,2}):(\d{2})\]/g;
const docPattern = /\[([^\],]+?),\s*p\.?\s*(\d+)\]/g;

function toSeconds(minutes: string, seconds: string) {
  const mm = Number(minutes);
  const ss = Number(seconds);
  if (!Number.isFinite(mm) || !Number.isFinite(ss)) return 0;
  return Math.max(0, mm * 60 + ss);
}

export function parseCitations(text: string): CitationSegment[] {
  const input = String(text || "");
  if (!input) return [{ type: "text", value: "" }];

  const segments: CitationSegment[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    mediaPattern.lastIndex = cursor;
    docPattern.lastIndex = cursor;

    const mediaMatch = mediaPattern.exec(input);
    const docMatch = docPattern.exec(input);

    let nextMatch: RegExpExecArray | null = null;
    let nextType: "media" | "doc" | null = null;

    if (mediaMatch && docMatch) {
      if (mediaMatch.index <= docMatch.index) {
        nextMatch = mediaMatch;
        nextType = "media";
      } else {
        nextMatch = docMatch;
        nextType = "doc";
      }
    } else if (mediaMatch) {
      nextMatch = mediaMatch;
      nextType = "media";
    } else if (docMatch) {
      nextMatch = docMatch;
      nextType = "doc";
    }

    if (!nextMatch || !nextType) {
      segments.push({ type: "text", value: input.slice(cursor) });
      break;
    }

    if (nextMatch.index > cursor) {
      segments.push({ type: "text", value: input.slice(cursor, nextMatch.index) });
    }

    const raw = nextMatch[0];
    const label = String(nextMatch[1] || "").trim();
    if (nextType === "media") {
      const seconds = toSeconds(nextMatch[2], nextMatch[3]);
      segments.push({ type: "media", label, seconds, raw });
    } else {
      const page = Number(nextMatch[2]);
      segments.push({ type: "doc", label, page: Number.isFinite(page) ? page : 1, raw });
    }

    cursor = nextMatch.index + raw.length;
  }

  return segments.length ? segments : [{ type: "text", value: input }];
}
