import { getCsrfHeader } from "./csrf";
import { getApiBase } from "./apiBase";
import { storageService } from "./storageService";

const WORKSPACE_KEY = "workspace_id";
const WORKSPACE_ROLE_KEY = "workspace_role";
const WORKSPACE_NAME_KEY = "workspace_name";
const AUTH_TOKEN_KEY = "auth_token";
const MATTER_ID_KEY = "matter_id";
const MATTER_NAME_KEY = "matter_name";
const SESSION_ENDPOINT = "/auth/me";
const LOGOUT_ENDPOINT = "/auth/logout";

function readKey(key: string): string {
  try {
    const value = sessionStorage.getItem(key);
    if (value) return value;
  } catch {
    // ignore
  }
  return "";
}

function writeKey(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function clearKey(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getWorkspaceId() {
  return readKey(WORKSPACE_KEY);
}

export function setWorkspaceId(id: string) {
  writeKey(WORKSPACE_KEY, id);
}

export function clearWorkspaceId() {
  clearKey(WORKSPACE_KEY);
}

export function getWorkspaceRole() {
  return readKey(WORKSPACE_ROLE_KEY);
}

export function setWorkspaceRole(role: string) {
  writeKey(WORKSPACE_ROLE_KEY, role);
}

export function clearWorkspaceRole() {
  clearKey(WORKSPACE_ROLE_KEY);
}

export function getWorkspaceName() {
  return readKey(WORKSPACE_NAME_KEY);
}

export function setWorkspaceName(name: string) {
  writeKey(WORKSPACE_NAME_KEY, name);
}

export function clearWorkspaceName() {
  clearKey(WORKSPACE_NAME_KEY);
}

export function getAuthToken() {
  return readKey(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  writeKey(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  clearKey(AUTH_TOKEN_KEY);
}

export function getMatterId() {
  return readKey(MATTER_ID_KEY);
}

export function setMatterId(id: string) {
  writeKey(MATTER_ID_KEY, id);
}

export function clearMatterId() {
  clearKey(MATTER_ID_KEY);
}

export function getMatterName() {
  return readKey(MATTER_NAME_KEY);
}

export function setMatterName(name: string) {
  writeKey(MATTER_NAME_KEY, name);
}

export function clearMatterName() {
  clearKey(MATTER_NAME_KEY);
}

export function isAuthenticated() {
  return Boolean(getWorkspaceId());
}

export async function refreshSession(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    const workspaceId = getWorkspaceId();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (workspaceId) headers["x-workspace-id"] = workspaceId;
    const res = await fetch(`${getApiBase()}${SESSION_ENDPOINT}`, {
      credentials: "include",
      headers
    });
    if (!res.ok) {
      if (getAuthToken() && getWorkspaceId()) {
        return true;
      }
      clearWorkspaceId();
      clearAuthToken();
      return false;
    }
    const data = await res.json().catch(() => ({}));
    if (data?.workspaceId) {
      setWorkspaceId(String(data.workspaceId));
      if (data?.workspaceName) {
        setWorkspaceName(String(data.workspaceName));
      } else {
        clearWorkspaceName();
      }
      if (data?.role) {
        setWorkspaceRole(String(data.role));
      } else {
        clearWorkspaceRole();
      }
      if (data?.matterId) {
        setMatterId(String(data.matterId));
      }
      if (data?.matterName) {
        setMatterName(String(data.matterName));
      }
      return true;
    }
    clearWorkspaceId();
    clearWorkspaceRole();
    clearWorkspaceName();
    clearAuthToken();
    clearMatterId();
    clearMatterName();
    return false;
  } catch {
    return Boolean(getWorkspaceId());
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${getApiBase()}${LOGOUT_ENDPOINT}`, {
      method: "POST",
      headers: getCsrfHeader(),
      credentials: "include"
    });
  } catch {
    // ignore
  } finally {
    clearWorkspaceId();
    clearWorkspaceRole();
    clearWorkspaceName();
    clearAuthToken();
    clearMatterId();
    clearMatterName();
    try {
      if (typeof window !== "undefined") {
        try {
          localStorage.clear();
        } catch {
          // ignore
        }
        try {
          sessionStorage.clear();
        } catch {
          // ignore
        }
        try {
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
          }
        } catch {
          // ignore
        }
      }
      await storageService.clear();
    } catch {
      // ignore
    }
  }
}
