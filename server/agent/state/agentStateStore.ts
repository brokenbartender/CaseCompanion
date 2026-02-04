import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { safeResolve } from "../../pathUtils.js";

type AgentMemory = {
  notes: string[];
  events: Array<{ ts: string; type: string; payload: string }>;
  incidents: Array<{ ts: string; severity: string; summary: string }>;
  evaluations: Array<{ ts: string; name: string; notes?: string }>;
  oversightRules: Array<{ ts: string; rule: string; severity: string }>;
  bdi: Array<{ ts: string; kind: string; text: string }>;
  checkpoints: Array<{ ts: string; label: string; notes?: string }>;
  updatedAt: string;
};

type AgentTask = {
  id: string;
  workspaceId: string;
  userId: string;
  goal: string;
  summary?: string;
  status: "PLANNING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  steps: Array<{
    id: string;
    description: string;
    tool: string;
    args: Record<string, any>;
    status: "PENDING" | "DONE" | "FAILED" | "SKIPPED";
    output?: string;
  }>;
  logs: Array<{ ts: string; message: string }>;
  createdAt: string;
  updatedAt: string;
};

const DATA_ROOT = path.resolve(process.cwd(), "server", "data", "agent");

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function workspaceDir(workspaceId: string, userId: string) {
  const base = safeResolve(DATA_ROOT, workspaceId);
  return safeResolve(base, userId);
}

function memoryPath(workspaceId: string, userId: string) {
  return safeResolve(workspaceDir(workspaceId, userId), "memory.json");
}

function taskPath(workspaceId: string, userId: string, taskId: string) {
  return safeResolve(workspaceDir(workspaceId, userId), path.join("tasks", `${taskId}.json`));
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, payload: any) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

export const agentStateStore = {
  async getMemory(workspaceId: string, userId: string): Promise<AgentMemory> {
    const baseDir = workspaceDir(workspaceId, userId);
    await ensureDir(baseDir);
    const fallback: AgentMemory = {
      notes: [],
      events: [],
      incidents: [],
      evaluations: [],
      oversightRules: [],
      bdi: [],
      checkpoints: [],
      updatedAt: new Date().toISOString()
    };
    const stored = await readJson(memoryPath(workspaceId, userId), fallback);
    return {
      ...fallback,
      ...stored,
      notes: stored?.notes ?? [],
      events: stored?.events ?? [],
      incidents: stored?.incidents ?? [],
      evaluations: stored?.evaluations ?? [],
      oversightRules: stored?.oversightRules ?? [],
      bdi: stored?.bdi ?? [],
      checkpoints: stored?.checkpoints ?? []
    };
  },

  async remember(workspaceId: string, userId: string, note: string) {
    const memory = await this.getMemory(workspaceId, userId);
    const next = {
      ...memory,
      notes: [...memory.notes, note].slice(-100),
      updatedAt: new Date().toISOString()
    };
    await writeJson(memoryPath(workspaceId, userId), next);
  },

  async logEvent(workspaceId: string, userId: string, type: string, payload: string) {
    const memory = await this.getMemory(workspaceId, userId);
    const next = {
      ...memory,
      events: [...memory.events, { ts: new Date().toISOString(), type, payload }].slice(-500),
      updatedAt: new Date().toISOString()
    };
    await writeJson(memoryPath(workspaceId, userId), next);
  },

  async addIncident(workspaceId: string, userId: string, severity: string, summary: string) {
    const memory = await this.getMemory(workspaceId, userId);
    const next = {
      ...memory,
      incidents: [...memory.incidents, { ts: new Date().toISOString(), severity, summary }].slice(-100),
      updatedAt: new Date().toISOString()
    };
    await writeJson(memoryPath(workspaceId, userId), next);
  },

  async addEvaluation(workspaceId: string, userId: string, name: string, notes?: string) {
    const memory = await this.getMemory(workspaceId, userId);
    const next = {
      ...memory,
      evaluations: [...memory.evaluations, { ts: new Date().toISOString(), name, notes }].slice(-100),
      updatedAt: new Date().toISOString()
    };
    await writeJson(memoryPath(workspaceId, userId), next);
  },

  async addOversightRule(workspaceId: string, userId: string, rule: string, severity: string) {
    const memory = await this.getMemory(workspaceId, userId);
    const next = {
      ...memory,
      oversightRules: [...memory.oversightRules, { ts: new Date().toISOString(), rule, severity }].slice(-100),
      updatedAt: new Date().toISOString()
    };
    await writeJson(memoryPath(workspaceId, userId), next);
  },

  async addBdi(workspaceId: string, userId: string, kind: string, text: string) {
    const memory = await this.getMemory(workspaceId, userId);
    const next = {
      ...memory,
      bdi: [...memory.bdi, { ts: new Date().toISOString(), kind, text }].slice(-200),
      updatedAt: new Date().toISOString()
    };
    await writeJson(memoryPath(workspaceId, userId), next);
  },

  async addCheckpoint(workspaceId: string, userId: string, label: string, notes?: string) {
    const memory = await this.getMemory(workspaceId, userId);
    const next = {
      ...memory,
      checkpoints: [...memory.checkpoints, { ts: new Date().toISOString(), label, notes }].slice(-100),
      updatedAt: new Date().toISOString()
    };
    await writeJson(memoryPath(workspaceId, userId), next);
  },

  async startTask(workspaceId: string, userId: string, goal: string) {
    const task: AgentTask = {
      id: crypto.randomUUID(),
      workspaceId,
      userId,
      goal,
      status: "PLANNING",
      steps: [],
      logs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await writeJson(taskPath(workspaceId, userId, task.id), task);
    return task;
  },

  async updateTask(workspaceId: string, userId: string, task: AgentTask) {
    task.updatedAt = new Date().toISOString();
    await writeJson(taskPath(workspaceId, userId, task.id), task);
  },

  async appendLog(workspaceId: string, userId: string, taskId: string, message: string) {
    const task = await readJson<AgentTask>(taskPath(workspaceId, userId, taskId), null as any);
    if (!task) return;
    task.logs.push({ ts: new Date().toISOString(), message });
    task.updatedAt = new Date().toISOString();
    await writeJson(taskPath(workspaceId, userId, taskId), task);
  }
};
