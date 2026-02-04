import { prisma } from "../lib/prisma.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral";
const OLLAMA_CONTEXT = Number(process.env.OLLAMA_NUM_CTX || 8192);
const OLLAMA_PREDICT = Number(process.env.OLLAMA_NUM_PREDICT || 1024);
const OLLAMA_THREADS = Number(process.env.OLLAMA_NUM_THREAD || 0);
const OLLAMA_GPU = Number(process.env.OLLAMA_NUM_GPU || 0);

const AI_COMPUTE_MODE = String(process.env.AI_COMPUTE_MODE || "LOCAL_OLLAMA").toUpperCase();
const AI_BENCHMARK_MAX_MS = Number(process.env.AI_BENCHMARK_MAX_MS || 200);
const AI_BENCHMARK_PROMPT = "Return OK.";
const LEXIS_CLOUD_URL = String(process.env.LEXIS_CLOUD_URL || "").trim();
const LEXIS_CLOUD_API_KEY = String(process.env.LEXIS_CLOUD_API_KEY || "").trim();
const LEXIS_CLOUD_MODEL = String(process.env.LEXIS_CLOUD_MODEL || "lexis-forensic").trim();

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

type LocalAiOptions = {
  temperature?: number;
  stop?: string[];
  timeoutMs?: number;
  model?: string;
  stream?: boolean;
};

type AiProvider = {
  name: string;
  isHealthy(): Promise<boolean>;
  generate(prompt: string, options?: LocalAiOptions): Promise<string>;
  generateStream(
    prompt: string,
    options?: LocalAiOptions,
    onToken?: (token: string) => void
  ): Promise<string>;
};

class OllamaProvider implements AiProvider {
  name = "LOCAL_OLLAMA";

  async isHealthy(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${OLLAMA_URL.replace(/\/$/, "")}/api/tags`, { method: "GET" }, 1000);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, options: LocalAiOptions = {}): Promise<string> {
    const temperature = typeof options.temperature === "number" ? options.temperature : 0.1;
    const stop = Array.isArray(options.stop) ? options.stop : ["Observation:"];
    const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 15000;
    const model = options.model || OLLAMA_MODEL;
    const num_ctx = Number.isFinite(OLLAMA_CONTEXT) && OLLAMA_CONTEXT > 0 ? OLLAMA_CONTEXT : undefined;
    const num_predict = Number.isFinite(OLLAMA_PREDICT) && OLLAMA_PREDICT > 0 ? OLLAMA_PREDICT : undefined;
    const num_thread = Number.isFinite(OLLAMA_THREADS) && OLLAMA_THREADS > 0 ? OLLAMA_THREADS : undefined;
    const num_gpu = Number.isFinite(OLLAMA_GPU) && OLLAMA_GPU > 0 ? OLLAMA_GPU : undefined;

    const stream = typeof options.stream === "boolean" ? options.stream : true;
    const res = await fetchWithTimeout(
      `${OLLAMA_URL.replace(/\/$/, "")}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream,
          options: {
            temperature,
            stop,
            ...(num_ctx ? { num_ctx } : {}),
            ...(num_predict ? { num_predict } : {}),
            ...(num_thread ? { num_thread } : {}),
            ...(num_gpu ? { num_gpu } : {})
          }
        })
      },
      timeoutMs
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Ollama error ${res.status}`);
    }
    if (!stream) {
      const data = await res.json().catch(() => ({}));
      return String((data as any)?.response || "");
    }

    const reader = res.body?.getReader();
    if (!reader) return "";
    const decoder = new TextDecoder();
    let buffer = "";
    let output = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed?.response === "string") {
            output += parsed.response;
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (typeof parsed?.response === "string") {
          output += parsed.response;
        }
      } catch {
        // ignore trailing data
      }
    }
    return output;
  }

  async generateStream(
    prompt: string,
    options: LocalAiOptions = {},
    onToken?: (token: string) => void
  ): Promise<string> {
    const temperature = typeof options.temperature === "number" ? options.temperature : 0.1;
    const stop = Array.isArray(options.stop) ? options.stop : ["Observation:"];
    const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 15000;
    const model = options.model || OLLAMA_MODEL;
    const num_ctx = Number.isFinite(OLLAMA_CONTEXT) && OLLAMA_CONTEXT > 0 ? OLLAMA_CONTEXT : undefined;
    const num_predict = Number.isFinite(OLLAMA_PREDICT) && OLLAMA_PREDICT > 0 ? OLLAMA_PREDICT : undefined;
    const num_thread = Number.isFinite(OLLAMA_THREADS) && OLLAMA_THREADS > 0 ? OLLAMA_THREADS : undefined;
    const num_gpu = Number.isFinite(OLLAMA_GPU) && OLLAMA_GPU > 0 ? OLLAMA_GPU : undefined;

    const res = await fetchWithTimeout(
      `${OLLAMA_URL.replace(/\/$/, "")}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: true,
          options: {
            temperature,
            stop,
            ...(num_ctx ? { num_ctx } : {}),
            ...(num_predict ? { num_predict } : {}),
            ...(num_thread ? { num_thread } : {}),
            ...(num_gpu ? { num_gpu } : {})
          }
        })
      },
      timeoutMs
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Ollama error ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) return "";
    const decoder = new TextDecoder();
    let buffer = "";
    let output = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed?.response === "string") {
            output += parsed.response;
            onToken?.(parsed.response);
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer.trim());
        if (typeof parsed?.response === "string") {
          output += parsed.response;
          onToken?.(parsed.response);
        }
      } catch {
        // ignore trailing data
      }
    }
    return output;
  }
}

class LexisCloudProvider implements AiProvider {
  name = "LEXIS_PRIVATE_CLOUD";

  async isHealthy(): Promise<boolean> {
    if (!LEXIS_CLOUD_URL || !LEXIS_CLOUD_API_KEY) return false;
    try {
      const res = await fetchWithTimeout(`${LEXIS_CLOUD_URL.replace(/\/$/, "")}/v1/models`, {
        method: "GET",
        headers: { Authorization: `Bearer ${LEXIS_CLOUD_API_KEY}` }
      }, 1500);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, options: LocalAiOptions = {}): Promise<string> {
    if (!LEXIS_CLOUD_URL || !LEXIS_CLOUD_API_KEY) {
      throw new Error("Lexis cloud AI not configured.");
    }
    const temperature = typeof options.temperature === "number" ? options.temperature : 0.1;
    const model = options.model || LEXIS_CLOUD_MODEL;
    const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 20000;

    const res = await fetchWithTimeout(
      `${LEXIS_CLOUD_URL.replace(/\/$/, "")}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LEXIS_CLOUD_API_KEY}`
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [{ role: "user", content: prompt }]
        })
      },
      timeoutMs
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Lexis cloud error ${res.status}`);
    }
    const data = await res.json().catch(() => ({}));
    return String((data as any)?.choices?.[0]?.message?.content || "");
  }

  async generateStream(
    prompt: string,
    options: LocalAiOptions = {},
    onToken?: (token: string) => void
  ): Promise<string> {
    const output = await this.generate(prompt, options);
    if (output) onToken?.(output);
    return output;
  }
}

type PerformanceStatus = {
  status: "OPTIMAL" | "DEGRADED";
  latencyMs: number;
  provider: string;
  checkedAt: string;
};

const providers: Record<string, AiProvider> = {
  LOCAL_OLLAMA: new OllamaProvider(),
  AIR_GAPPED_WORKSTATION: new OllamaProvider(),
  LEXIS_PRIVATE_CLOUD: new LexisCloudProvider()
};

let cachedPerformance: PerformanceStatus | null = null;

async function runBenchmark(provider: AiProvider): Promise<PerformanceStatus> {
  const start = Date.now();
  try {
    await provider.generate(AI_BENCHMARK_PROMPT, { timeoutMs: AI_BENCHMARK_MAX_MS * 5, stream: false, stop: [] });
  } catch {
    // treat failures as degraded
  }
  const latencyMs = Date.now() - start;
  const status = latencyMs <= AI_BENCHMARK_MAX_MS ? "OPTIMAL" : "DEGRADED";
  return { status, latencyMs, provider: provider.name, checkedAt: new Date().toISOString() };
}

async function selectProvider(): Promise<AiProvider> {
  if (AI_COMPUTE_MODE === "AUTO") {
    const primary = providers.LOCAL_OLLAMA;
    cachedPerformance = await runBenchmark(primary);
    if (cachedPerformance.status === "DEGRADED" && providers.LEXIS_PRIVATE_CLOUD) {
      const ok = await providers.LEXIS_PRIVATE_CLOUD.isHealthy();
      if (ok) return providers.LEXIS_PRIVATE_CLOUD;
    }
    return primary;
  }
  return providers[AI_COMPUTE_MODE] || providers.LOCAL_OLLAMA;
}

export const localAiService = {
  async isHealthy(): Promise<boolean> {
    const provider = await selectProvider();
    return provider.isHealthy();
  },
  async generate(prompt: string, options: LocalAiOptions = {}): Promise<string> {
    const provider = await selectProvider();
    return provider.generate(prompt, options);
  },
  async generateStream(
    prompt: string,
    options: LocalAiOptions = {},
    onToken?: (token: string) => void
  ): Promise<string> {
    const provider = await selectProvider();
    return provider.generateStream(prompt, options, onToken);
  },
  async checkHardwareCapability(): Promise<PerformanceStatus> {
    const provider = AI_COMPUTE_MODE === "AUTO" ? providers.LOCAL_OLLAMA : (providers[AI_COMPUTE_MODE] || providers.LOCAL_OLLAMA);
    cachedPerformance = await runBenchmark(provider);
    return cachedPerformance;
  },
  getPerformanceStatus(): PerformanceStatus | null {
    return cachedPerformance;
  },
  async saveInferenceProgress(args: {
    workspaceId: string;
    userId: string;
    exhibitId?: string | null;
    caseId?: string | null;
    stepIndex: number;
    heartbeatHash: string;
    evidenceHash?: string | null;
    state: Record<string, any>;
  }) {
    const existing = args.exhibitId
      ? await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "InferenceState"
          WHERE "workspaceId" = ${args.workspaceId}
            AND "userId" = ${args.userId}
            AND "exhibitId" = ${args.exhibitId}
          ORDER BY "updatedAt" DESC
          LIMIT 1
        `
      : await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "InferenceState"
          WHERE "workspaceId" = ${args.workspaceId}
            AND "userId" = ${args.userId}
            AND "exhibitId" IS NULL
          ORDER BY "updatedAt" DESC
          LIMIT 1
        `;

    const payload = {
      workspaceId: args.workspaceId,
      userId: args.userId,
      exhibitId: args.exhibitId || null,
      caseId: args.caseId || null,
      stepIndex: args.stepIndex,
      heartbeatHash: args.heartbeatHash,
      evidenceHash: args.evidenceHash || null,
      stateJson: JSON.stringify(args.state || {})
    };

    if (existing?.[0]?.id) {
      await prisma.$executeRaw`
        UPDATE "InferenceState"
        SET "workspaceId" = ${payload.workspaceId},
            "userId" = ${payload.userId},
            "exhibitId" = ${payload.exhibitId},
            "caseId" = ${payload.caseId},
            "stepIndex" = ${payload.stepIndex},
            "heartbeatHash" = ${payload.heartbeatHash},
            "evidenceHash" = ${payload.evidenceHash},
            "stateJson" = ${payload.stateJson},
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${existing[0].id}
      `;
      return { id: existing[0].id, ...payload };
    }

    await prisma.$executeRaw`
      INSERT INTO "InferenceState"
      ("id", "workspaceId", "userId", "exhibitId", "caseId", "stepIndex", "heartbeatHash", "evidenceHash", "stateJson", "createdAt", "updatedAt")
      VALUES
      (md5(random()::text || clock_timestamp()::text), ${payload.workspaceId}, ${payload.userId}, ${payload.exhibitId}, ${payload.caseId}, ${payload.stepIndex}, ${payload.heartbeatHash}, ${payload.evidenceHash}, ${payload.stateJson}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    return payload;
  },
  async getInferenceState(workspaceId: string, userId: string, exhibitId?: string | null) {
    const rows = exhibitId
      ? await prisma.$queryRaw<
          Array<{
            id: string;
            workspaceId: string;
            userId: string;
            exhibitId: string | null;
            caseId: string | null;
            stepIndex: number;
            heartbeatHash: string;
            evidenceHash: string | null;
            stateJson: string;
            createdAt: Date;
            updatedAt: Date;
          }>
        >`SELECT * FROM "InferenceState" WHERE "workspaceId" = ${workspaceId} AND "userId" = ${userId} AND "exhibitId" = ${exhibitId} ORDER BY "updatedAt" DESC LIMIT 1`
      : await prisma.$queryRaw<
          Array<{
            id: string;
            workspaceId: string;
            userId: string;
            exhibitId: string | null;
            caseId: string | null;
            stepIndex: number;
            heartbeatHash: string;
            evidenceHash: string | null;
            stateJson: string;
            createdAt: Date;
            updatedAt: Date;
          }>
        >`SELECT * FROM "InferenceState" WHERE "workspaceId" = ${workspaceId} AND "userId" = ${userId} AND "exhibitId" IS NULL ORDER BY "updatedAt" DESC LIMIT 1`;
    return rows?.[0] || null;
  }
};
