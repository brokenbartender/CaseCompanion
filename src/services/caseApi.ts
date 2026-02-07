import { api } from "./api";
import { getWorkspaceId, getMatterId } from "./authStorage";

function scopePath(path: string, workspaceId?: string, matterId?: string) {
  const ws = workspaceId || getWorkspaceId();
  const matter = matterId || getMatterId();
  return `/workspaces/${ws}/matters/${matter}${path}`;
}

export async function fetchCaseProfile() {
  return api.get(scopePath("/case-profile"));
}

export async function updateCaseProfile(payload: any) {
  return api.put(scopePath("/case-profile"), payload);
}

export async function fetchProceduralStatus() {
  return api.get(scopePath("/procedural/status"));
}

export async function fetchPiiScan() {
  return api.get(scopePath("/pii-scan"));
}

export async function markRedactionApplied(exhibitId: string) {
  return api.post(scopePath(`/exhibits/${exhibitId}/redaction/complete`));
}

export async function listServiceAttempts() {
  return api.get(scopePath("/service-attempts"));
}

export async function createServiceAttempt(payload: any) {
  return api.post(scopePath("/service-attempts"), payload);
}

export async function listCaseDocuments() {
  return api.get(scopePath("/case-documents"));
}

export async function createCaseDocument(payload: any) {
  return api.post(scopePath("/case-documents"), payload);
}

export async function updateCaseDocument(documentId: string, payload: any) {
  return api.put(scopePath(`/case-documents/${documentId}`), payload);
}

export async function listParties() {
  return api.get(scopePath("/parties"));
}

export async function createParty(payload: any) {
  return api.post(scopePath("/parties"), payload);
}

export async function deleteParty(partyId: string) {
  return api.del(scopePath(`/parties/${partyId}`));
}

export async function fetchCourtProfile() {
  return api.get(scopePath("/court-profile"));
}

export async function updateCourtProfile(payload: any) {
  return api.put(scopePath("/court-profile"), payload);
}

export async function listSchedulingOrders() {
  return api.get(scopePath("/scheduling-orders"));
}

export async function createSchedulingOrder(payload: any) {
  return api.post(scopePath("/scheduling-orders"), payload);
}
