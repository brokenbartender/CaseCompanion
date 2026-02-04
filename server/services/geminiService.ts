import { GoogleGenAI } from "@google/genai";
import { localAiService } from "./localAiService.js";
import { verifyGrounding } from "./HallucinationKiller.js";

const GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = String(process.env.GEMINI_MODEL || "gemini-1.5-pro").trim();
const GEMINI_RETRY_MAX = Number(process.env.GEMINI_RETRY_MAX || 2);
const GEMINI_RETRY_BASE_MS = Number(process.env.GEMINI_RETRY_BASE_MS || 500);
const GEMINI_RETRY_MAX_MS = Number(process.env.GEMINI_RETRY_MAX_MS || 8000);
const GEMINI_FAILOVER_MODE = String(process.env.GEMINI_FAILOVER_MODE || "").trim().toUpperCase();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getStatusCode = (err: any) => {
  return err?.status || err?.response?.status || err?.cause?.status || 0;
};

const isRetryable = (err: any) => {
  const status = getStatusCode(err);
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  const message = String(err?.message || "");
  return message.includes("429") || message.includes("rate limit") || message.includes("temporarily");
};

const getRetryAfterMs = (err: any) => {
  const raw = err?.response?.headers?.get?.("retry-after") || err?.response?.headers?.["retry-after"];
  const value = Number(raw);
  if (Number.isFinite(value) && value > 0) {
    return Math.min(value * 1000, GEMINI_RETRY_MAX_MS);
  }
  return 0;
};

async function generateResponse(prompt: string, options?: { sourceIds?: string[]; sourceEvidence?: Array<{ id: string; text?: string | null }> }) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  let lastError: any = null;

  for (let attempt = 0; attempt <= GEMINI_RETRY_MAX; attempt += 1) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt
      });
      const text = String(response.text || "");
      if (options?.sourceIds && options.sourceIds.length > 0) {
        const evidence = options.sourceEvidence && options.sourceEvidence.length > 0
          ? options.sourceEvidence
          : options.sourceIds;
        const grounding = await verifyGrounding(text, evidence);
        if (!grounding.approved) {
          return "I cannot answer this based on the provided evidence.";
        }
      }
      return text;
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt >= GEMINI_RETRY_MAX) break;
      const retryAfter = getRetryAfterMs(err);
      const jitter = Math.floor(Math.random() * 150);
      const backoff = Math.min(GEMINI_RETRY_BASE_MS * (2 ** attempt), GEMINI_RETRY_MAX_MS);
      await sleep(Math.max(retryAfter, backoff + jitter));
    }
  }

  if (GEMINI_FAILOVER_MODE === "LOCAL_OLLAMA") {
    return localAiService.generate(prompt, { stream: false, stop: [] });
  }

  throw lastError || new Error("Gemini request failed");
}

export const geminiService = {
  generateResponse,
  modelName: GEMINI_MODEL
};
