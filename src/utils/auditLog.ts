import { readJson, writeJson } from "./localStore";

const AUDIT_KEY = "case_companion_audit_log_v1";

export type LocalAuditEvent = {
  id: string;
  action: string;
  createdAt: string;
  details?: Record<string, any>;
};

export function logAuditEvent(action: string, details?: Record<string, any>) {
  const existing = readJson<LocalAuditEvent[]>(AUDIT_KEY, []);
  const event: LocalAuditEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    createdAt: new Date().toISOString(),
    details
  };
  const next = [event, ...existing].slice(0, 250);
  writeJson(AUDIT_KEY, next);
  return event;
}

export function readAuditEvents() {
  return readJson<LocalAuditEvent[]>(AUDIT_KEY, []);
}
