import { GoogleGenAI } from "@google/genai";
import { localAiService } from "./localAiService.js";

const SEMANTIC_TIMEOUT_MS = Number(process.env.SEMANTIC_ADVERSARY_TIMEOUT_MS || 5000);

function getMode() {
  return String(process.env.SEMANTIC_ADVERSARY_MODE || "").trim().toUpperCase();
}

function getModel() {
  return String(process.env.SEMANTIC_ADVERSARY_MODEL || "gemini-1.5-flash").trim();
}

function getGeminiKey() {
  return String(process.env.GEMINI_API_KEY || "").trim();
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: getModel(),
    contents: prompt,
    config: {
      temperature: 0,
      maxOutputTokens: 4
    }
  });
  return String(response.text || "");
}

async function callLocal(prompt: string): Promise<string> {
  return localAiService.generate(prompt, {
    temperature: 0,
    stop: [],
    timeoutMs: SEMANTIC_TIMEOUT_MS,
    stream: false,
    model: process.env.SEMANTIC_ADVERSARY_LOCAL_MODEL || undefined
  });
}

function deterministicCheck(claim: string, evidenceText: string): boolean {
  const normalizedClaim = normalize(claim).toLowerCase();
  const normalizedEvidence = normalize(evidenceText).toLowerCase();
  if (!normalizedClaim || !normalizedEvidence) return false;
  return normalizedEvidence.includes(normalizedClaim);
}

export async function verifyLogicalSupport(claim: string, evidenceText: string): Promise<boolean> {
  const normalizedClaim = normalize(claim);
  const normalizedEvidence = normalize(evidenceText);
  if (!normalizedClaim || !normalizedEvidence) return false;

  const mode = getMode();
  if (mode === "DETERMINISTIC" || process.env.NODE_ENV === "test" || !getGeminiKey()) {
    return deterministicCheck(normalizedClaim, normalizedEvidence);
  }

  const prompt = [
    "You are a logical auditor. Does the following text EXPLICITLY support the claim? Answer only TRUE or FALSE.",
    `Text: ${normalizedEvidence}`,
    `Claim: ${normalizedClaim}`
  ].join("\n");

  let output = "";
  try {
    if (mode === "LOCAL_OLLAMA") {
      output = await callLocal(prompt);
    } else {
      output = await callGemini(prompt);
    }
  } catch {
    return false;
  }

  const verdict = normalize(output).toUpperCase();
  return verdict === "TRUE";
}

export const semanticAdversary = {
  verifyLogicalSupport
};
