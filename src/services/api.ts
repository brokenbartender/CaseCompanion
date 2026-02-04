/**
 * Minimal API client for LexiPro Forensic OS.
 * - Uses same-origin /api by default (nginx + dev proxy)
 * - Sends cookies for auth and workspace scoping when present
 */
import { getAuthToken, getWorkspaceId } from "./authStorage";
import { CASE_CONFIG } from "./CaseConfig";
import { getCsrfHeader } from "./csrf";
import { getApiBase } from "./apiBase";

type InternalInit = RequestInit & { _retry?: boolean };

type OfflineQueueEntry = {
  id: string;
  method: string;
  path: string;
  body?: any;
  createdAt: string;
};

const OFFLINE_CACHE_PREFIX = "lexipro_offline_cache:";
const OFFLINE_QUEUE_KEY = "lexipro_offline_queue";
let flushingOfflineQueue = false;

function getCacheKey(path: string) {
  return `${OFFLINE_CACHE_PREFIX}${path}`;
}

function shouldCache(method: string, path: string) {
  if (method.toUpperCase() !== "GET") return false;
  return /\/matters|\/exhibits|\/documents/i.test(path);
}

function loadCached(path: string) {
  try {
    const raw = localStorage.getItem(getCacheKey(path));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data ?? null;
  } catch {
    return null;
  }
}

function storeCached(path: string, data: any) {
  try {
    localStorage.setItem(getCacheKey(path), JSON.stringify({ at: new Date().toISOString(), data }));
  } catch {
    // ignore
  }
}

function enqueueOfflineRequest(entry: OfflineQueueEntry) {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const current = raw ? JSON.parse(raw) : [];
    current.push(entry);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

async function flushOfflineQueue() {
  if (flushingOfflineQueue || typeof window === "undefined") return;
  flushingOfflineQueue = true;
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue: OfflineQueueEntry[] = raw ? JSON.parse(raw) : [];
    if (!queue.length) return;
    const remaining: OfflineQueueEntry[] = [];
    for (const entry of queue) {
      try {
        const base = getApiBase().replace(/\/$/, "");
        const url = entry.path.startsWith("http")
          ? entry.path
          : `${base}${entry.path.startsWith("/") ? "" : "/"}${entry.path}`;
        const headers: Record<string, string> = {
          Accept: "application/json",
          ...authHeaders()
        };
        if (entry.method.toUpperCase() !== "GET") {
          Object.assign(headers, getCsrfHeader());
          injectCsrfHeader(headers);
          headers["Content-Type"] = "application/json";
        }
        const res = await fetch(url, {
          method: entry.method,
          headers,
          body: entry.body ? JSON.stringify(entry.body) : undefined,
          credentials: "include"
        });
        if (!res.ok) {
          remaining.push(entry);
        }
      } catch {
        remaining.push(entry);
      }
    }
    if (remaining.length) {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }
  } finally {
    flushingOfflineQueue = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushOfflineQueue();
  });
}

function sanitizeErrorMessage(raw: string, fallback: string) {
  const text = (raw || "").trim();
  if (!text) return fallback;
  const singleLine = text.split(/\r?\n/)[0].replace(/^Error:\s*/i, "").trim();
  const stripped = singleLine.replace(/<[^>]*>/g, "").trim();
  if (!stripped) return fallback;
  return stripped.length > 240 ? `${stripped.slice(0, 237)}...` : stripped;
}

async function readErrorMessage(res: Response) {
  const fallback = `${res.status} ${res.statusText}`.trim();
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const data = await res.json();
      const message = data?.message || data?.error || data?.errorMessage || "";
      return sanitizeErrorMessage(String(message), fallback);
    } catch {
      return fallback;
    }
  }
  const text = await res.text().catch(() => "");
  return sanitizeErrorMessage(text, fallback);
}

function authHeaders(): Record<string, string> {
  const workspaceId = getWorkspaceId();
  const headers: Record<string, string> = {};
  if (workspaceId) headers["x-workspace-id"] = workspaceId;
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function buildAuthHeaders(token?: string, workspaceIdOverride?: string): Record<string, string> {
  const headers = { ...authHeaders() };
  if (workspaceIdOverride) headers["x-workspace-id"] = workspaceIdOverride;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function injectCsrfHeader(headers: Record<string, string>) {
  if (headers["x-csrf-token"]) return;
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|; )forensic_csrf=([^;]+)/);
    if (match?.[1]) {
      headers["x-csrf-token"] = match[1];
      return;
    }
  }
  const csrf = getCsrfHeader();
  if (csrf["x-csrf-token"]) headers["x-csrf-token"] = csrf["x-csrf-token"];
}

async function request(method: string, path: string, body?: any, init?: InternalInit) {
  const base = getApiBase().replace(/\/$/, "");
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...authHeaders(),
  };
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    Object.assign(headers, getCsrfHeader());
    injectCsrfHeader(headers);
  }
  Object.assign(headers, init?.headers as any);

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
    // browser sets boundary; don't set Content-Type
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response | null = null;
  let lastError: any = null;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: payload,
      credentials: "include",
      ...init,
    });
  } catch (err) {
    lastError = err;
    const shouldFallback = typeof window !== "undefined" && /^https?:\/\//i.test(url);
    if (shouldFallback) {
      const fallbackBase = "/api";
      const fallbackUrl = path.startsWith("http")
        ? path
        : `${fallbackBase}${path.startsWith("/") ? "" : "/"}${path}`;
      try {
        res = await fetch(fallbackUrl, {
          method,
          headers,
          body: payload,
          credentials: "include",
          ...init,
        });
      } catch (fallbackErr) {
        lastError = fallbackErr;
      }
    }
  }

  if (!res) {
    if (shouldCache(method, path)) {
      const cached = loadCached(path);
      if (cached) return cached;
    }
    if (method.toUpperCase() !== "GET") {
      enqueueOfflineRequest({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        method,
        path,
        body,
        createdAt: new Date().toISOString()
      });
      return { ok: true, queued: true, offline: true };
    }
    throw lastError || new Error("Network request failed");
  }

  if (res.status === 401 && typeof window !== "undefined") {
    if (!init?._retry) {
      const retryHeaders: Record<string, string> = {
        Accept: "application/json",
        ...authHeaders(),
        ...(init?.headers as any),
      };
      if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
        Object.assign(retryHeaders, getCsrfHeader());
        injectCsrfHeader(retryHeaders);
      } else {
        injectCsrfHeader(retryHeaders);
      }
      return request(method, path, body, { ...init, headers: retryHeaders, _retry: true });
    }
  }
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    if (shouldCache(method, path)) {
      storeCached(path, data);
    }
    return data;
  }
  const text = await res.text();
  if (shouldCache(method, path)) {
    storeCached(path, text);
  }
  return text;
}

export const api = {
  get: (path: string, init?: InternalInit) => request("GET", path, undefined, init),
  post: (path: string, body?: any, init?: InternalInit) => request("POST", path, body, init),
  put: (path: string, body?: any, init?: InternalInit) => request("PUT", path, body, init),
  del: (path: string, init?: InternalInit) => request("DELETE", path, undefined, init),

  postForm: (path: string, form: FormData) => request("POST", path, form),

  // Downloads a PDF (or any blob) and returns an object URL
  downloadBlobUrl: async (path: string, body?: any) => {
    const base = getApiBase().replace(/\/$/, "");
    const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

    const headers: Record<string, string> = {
      ...authHeaders(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    };
    if (body) {
      Object.assign(headers, getCsrfHeader());
      injectCsrfHeader(headers);
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
      });
    } catch (err) {
      const shouldFallback = typeof window !== "undefined" && /^https?:\/\//i.test(url);
      if (!shouldFallback) throw err;
      const fallbackUrl = path.startsWith("http") ? path : `/api${path.startsWith("/") ? "" : "/"}${path}`;
      res = await fetch(fallbackUrl, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
      });
    }

    if (!res.ok) {
      throw new Error(await readErrorMessage(res));
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
  fetchExhibitFile: async (exhibitId: string, token: string, matterId?: string) =>
    fetchExhibitFile(exhibitId, token, matterId),
  chatWithAI: async (message: string, workspaceId: string, token: string, matterId?: string) =>
    chatWithAI(message, workspaceId, token, matterId),
};

export const fetchExhibitFile = async (
  exhibitId: string,
  token: string,
  workspaceId: string = CASE_CONFIG.DEMO_WORKSPACE_ID,
  matterId: string = CASE_CONFIG.DEMO_MATTER_ID
): Promise<Blob> => {
  const base = getApiBase().replace(/\/$/, "");
  const inlineParam = "inline=1";
  const url = matterId
    ? `${base}/workspaces/${workspaceId}/matters/${matterId}/exhibits/${exhibitId}/file?${inlineParam}`
    : `${base}/workspaces/${workspaceId}/exhibits/${exhibitId}/file?${inlineParam}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        ...buildAuthHeaders(token, workspaceId)
      },
      credentials: "include",
    });
  } catch (err) {
    const fallbackUrl = matterId
      ? `/api/workspaces/${workspaceId}/matters/${matterId}/exhibits/${exhibitId}/file?${inlineParam}`
      : `/api/workspaces/${workspaceId}/exhibits/${exhibitId}/file?${inlineParam}`;
    res = await fetch(fallbackUrl, {
      headers: {
        ...buildAuthHeaders(token, workspaceId)
      },
      credentials: "include",
    });
  }

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return res.blob();
};

export const chatWithAI = async (
  message: string,
  workspaceId: string = CASE_CONFIG.DEMO_WORKSPACE_ID,
  token: string,
  matterId: string = CASE_CONFIG.DEMO_MATTER_ID
) => {
  const base = getApiBase().replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getCsrfHeader(),
        ...buildAuthHeaders(token, workspaceId)
      },
      body: JSON.stringify({
        userPrompt: message,
        promptKey: "case_assistant",
        workspaceId,
        matterId
      }),
      credentials: "include",
    });
  } catch (err) {
    res = await fetch(`/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getCsrfHeader(),
        ...buildAuthHeaders(token, workspaceId)
      },
      body: JSON.stringify({
        userPrompt: message,
        promptKey: "case_assistant",
        workspaceId,
        matterId
      }),
      credentials: "include",
    });
  }

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
};
