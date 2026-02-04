import { api } from "./api";
import { getWorkspaceId } from "./authStorage";

export const TOUR_PREF_KEY = "lexipro_tour_completed";
export const BATES_PREF_KEY = "batesCounter";

const BATES_DEFAULT_START = 12001;

const inMemoryPrefs: Record<string, string> = {};
let inMemoryBatesCounter = BATES_DEFAULT_START;

export function getInMemoryPref(key: string): string | undefined {
  return inMemoryPrefs[key];
}

export async function fetchWorkspacePrefs(workspaceId?: string | null) {
  const resolvedWorkspaceId = workspaceId || getWorkspaceId();
  if (!resolvedWorkspaceId) return { ...inMemoryPrefs };

  try {
    const res = await api.get(`/workspaces/${resolvedWorkspaceId}/prefs`);
    const prefs = res?.prefs && typeof res.prefs === "object" ? res.prefs : {};
    for (const [key, value] of Object.entries(prefs)) {
      inMemoryPrefs[key] = String(value);
    }
    return { ...inMemoryPrefs };
  } catch {
    return { ...inMemoryPrefs };
  }
}

export async function setWorkspacePref(
  key: string,
  value: string,
  workspaceId?: string | null
) {
  inMemoryPrefs[key] = value;
  const resolvedWorkspaceId = workspaceId || getWorkspaceId();
  if (!resolvedWorkspaceId) {
    return { ok: false, prefs: { ...inMemoryPrefs } };
  }

  try {
    const res = await api.post(`/workspaces/${resolvedWorkspaceId}/prefs`, { key, value });
    const prefs = res?.prefs && typeof res.prefs === "object" ? res.prefs : null;
    if (prefs) {
      for (const [prefKey, prefValue] of Object.entries(prefs)) {
        inMemoryPrefs[prefKey] = String(prefValue);
      }
    }
    return res;
  } catch {
    return { ok: false, prefs: { ...inMemoryPrefs } };
  }
}

const formatBatesRange = (start: number, end: number) => {
  const pad = (value: number) => String(value).padStart(8, "0");
  return `LEX-${pad(start)} - LEX-${pad(end)}`;
};

const reserveFromMemory = (pages: number, startAt: number, reason?: string) => {
  const safeStart = Number.isFinite(inMemoryBatesCounter) ? inMemoryBatesCounter : startAt;
  const start = safeStart;
  const end = start + pages - 1;
  const nextValue = end + 1;
  inMemoryBatesCounter = nextValue;
  return {
    start,
    end,
    nextValue,
    range: formatBatesRange(start, end),
    source: reason ? ("standby" as const) : ("memory" as const),
    reason
  };
};

export async function reserveBatesRange(
  pages: number,
  workspaceId?: string | null,
  startAt: number = BATES_DEFAULT_START
) {
  const pageCount = Number.isFinite(pages) ? Math.max(1, Math.floor(pages)) : 1;
  const resolvedWorkspaceId = workspaceId || getWorkspaceId();
  if (!resolvedWorkspaceId) return reserveFromMemory(pageCount, startAt, "Workspace missing");

  try {
    const res = await api.post(`/workspaces/${resolvedWorkspaceId}/prefs`, {
      key: BATES_PREF_KEY,
      pages: pageCount,
      startAt
    });
    const start = Number(res?.range?.start);
    const end = Number(res?.range?.end);
    const nextValue = Number(res?.range?.next);
    if (Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(nextValue)) {
      inMemoryBatesCounter = nextValue;
      return {
        start,
        end,
        nextValue,
        range: formatBatesRange(start, end),
        source: "api" as const
      };
    }
  } catch (err: any) {
    const message = String(err?.message || "");
    if (message.includes("PREFS_TABLE_MISSING") || message.toLowerCase().includes("no such table")) {
      console.info("[Bates] Workspace prefs unavailable. Using standby counter.");
      return reserveFromMemory(pageCount, startAt, "Workspace prefs unavailable. Run migrations.");
    }
  }

  return reserveFromMemory(pageCount, startAt);
}
