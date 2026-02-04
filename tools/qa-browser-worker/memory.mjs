import fs from "node:fs";
import path from "node:path";

const DEFAULT_MEMORY = {
  version: 1,
  updatedAt: null,
  runs: [],
  issueIndex: {},
  coverage: {
    routes: {},
  },
  notes: [],
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function getMemoryPath(repoRoot) {
  return path.join(repoRoot, "reports", "qa-agent-memory.json");
}

export function loadMemory(repoRoot) {
  const filePath = getMemoryPath(repoRoot);
  try {
    if (!fs.existsSync(filePath)) return { ...DEFAULT_MEMORY };
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_MEMORY, ...parsed };
  } catch {
    return { ...DEFAULT_MEMORY };
  }
}

export function saveMemory(repoRoot, memory) {
  const filePath = getMemoryPath(repoRoot);
  ensureDir(path.dirname(filePath));
  const payload = { ...DEFAULT_MEMORY, ...memory, updatedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

function trimRuns(runs, max = 30) {
  if (runs.length <= max) return runs;
  return runs.slice(runs.length - max);
}

function addRouteCoverage(memory, url, detail = {}) {
  if (!url) return;
  const pathname = (() => {
    try {
      return new URL(url).pathname || "/";
    } catch {
      return url;
    }
  })();
  const existing = memory.coverage.routes[pathname] || { hits: 0 };
  memory.coverage.routes[pathname] = {
    ...existing,
    hits: existing.hits + 1,
    lastSeenAt: new Date().toISOString(),
    ...detail,
  };
}

function indexIssue(memory, issue) {
  const key = `${issue.label || "unknown"}::${issue.type || "issue"}`;
  const existing = memory.issueIndex[key] || { count: 0 };
  memory.issueIndex[key] = {
    ...existing,
    label: issue.label || existing.label || "unknown",
    type: issue.type || existing.type || "issue",
    count: existing.count + 1,
    lastSeenAt: new Date().toISOString(),
    lastUrl: issue.url || issue.page || existing.lastUrl || "",
    suggestion: issue.suggestion || existing.suggestion || "",
  };
}

export function updateMemoryFromDiagnose(memory, report, reportDir) {
  const run = {
    id: path.basename(reportDir || ""),
    type: "diagnose-ui",
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    baseUrl: report.baseUrl,
    issuesCount: report.issues?.length || 0,
    issues: (report.issues || []).slice(0, 50),
    authState: report.authState || null,
  };
  memory.runs = trimRuns([...memory.runs, run]);
  (report.issues || []).forEach((issue) => {
    indexIssue(memory, issue);
    addRouteCoverage(memory, issue.url);
  });
  (report.interactions || []).forEach((interaction) => {
    addRouteCoverage(memory, interaction.before?.url, { lastTitle: interaction.before?.title });
  });
  return memory;
}

export function updateMemoryFromAutonomous(memory, report, reportDir) {
  const run = {
    id: path.basename(reportDir || ""),
    type: "autonomous",
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    baseUrl: report.baseUrl,
    stepsCount: report.steps?.length || 0,
    decisionsCount: report.decisions?.length || 0,
    model: report.model,
  };
  memory.runs = trimRuns([...memory.runs, run]);
  (report.steps || []).forEach((step) => {
    addRouteCoverage(memory, step.page?.url, { lastTitle: step.page?.title });
  });
  return memory;
}

export function updateMemoryFromAgentSession(memory, session) {
  const run = {
    id: session.id,
    type: "agent-session",
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    baseUrl: session.baseUrl,
    commands: session.commands || [],
  };
  memory.runs = trimRuns([...memory.runs, run]);
  (session.routes || []).forEach((route) => addRouteCoverage(memory, route.url, { lastTitle: route.title }));
  if (session.notes?.length) memory.notes.push(...session.notes);
  memory.notes = memory.notes.slice(-50);
  return memory;
}

export function summarizeMemory(memory) {
  const latestRuns = memory.runs.slice(-5).map((run) => {
    const tag =
      run.type === "diagnose-ui"
        ? `issues:${run.issuesCount}`
        : run.type === "autonomous"
          ? `steps:${run.stepsCount}`
          : `commands:${run.commands?.length || 0}`;
    return `${run.type}(${tag})@${run.finishedAt || run.startedAt}`;
  });
  const topIssues = Object.values(memory.issueIndex)
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 8)
    .map((issue) => `${issue.label} [${issue.type}] x${issue.count}`);
  const routes = Object.entries(memory.coverage.routes)
    .sort((a, b) => (b[1].hits || 0) - (a[1].hits || 0))
    .slice(0, 8)
    .map(([route, meta]) => `${route} (${meta.hits})`);
  return {
    updatedAt: memory.updatedAt,
    latestRuns,
    topIssues,
    routes,
    notes: memory.notes?.slice(-5) || [],
  };
}
