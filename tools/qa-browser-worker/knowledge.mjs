import fs from "node:fs";
import path from "node:path";

const DEFAULT_KNOWLEDGE = {
  version: 1,
  updatedAt: null,
  productName: "Enterprise App",
  goals: [],
  coreFlows: [],
  criticalRoutes: [],
  knownConstraints: [],
  qaHeuristics: [],
  notes: [],
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function getKnowledgePath(repoRoot) {
  return path.join(repoRoot, "reports", "qa-agent-knowledge.json");
}

export function loadKnowledge(repoRoot) {
  const filePath = getKnowledgePath(repoRoot);
  try {
    if (!fs.existsSync(filePath)) return { ...DEFAULT_KNOWLEDGE };
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_KNOWLEDGE, ...parsed };
  } catch {
    return { ...DEFAULT_KNOWLEDGE };
  }
}

export function saveKnowledge(repoRoot, knowledge) {
  const filePath = getKnowledgePath(repoRoot);
  ensureDir(path.dirname(filePath));
  const payload = { ...DEFAULT_KNOWLEDGE, ...knowledge, updatedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

export function summarizeKnowledge(knowledge) {
  return {
    updatedAt: knowledge.updatedAt,
    productName: knowledge.productName,
    goals: knowledge.goals?.slice(0, 6) || [],
    coreFlows: knowledge.coreFlows?.slice(0, 8) || [],
    criticalRoutes: knowledge.criticalRoutes?.slice(0, 8) || [],
    knownConstraints: knowledge.knownConstraints?.slice(0, 6) || [],
    qaHeuristics: knowledge.qaHeuristics?.slice(0, 8) || [],
    notes: knowledge.notes?.slice(-5) || [],
  };
}

export function seedKnowledge(repoRoot, overrides = {}) {
  const base = loadKnowledge(repoRoot);
  const merged = { ...base, ...overrides };
  saveKnowledge(repoRoot, merged);
  return merged;
}
