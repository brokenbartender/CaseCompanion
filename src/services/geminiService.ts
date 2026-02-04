// The "Neural Network" Router
// This service manages context switching between legal, medical, and financial modes.
import { getApiBase } from "./apiBase";
import { getCsrfHeader } from "./csrf";

export type AgentMode = "GENERAL_LEGAL" | "MEDICAL_EXAMINER" | "FORENSIC_ACCOUNTANT" | "JURY_CONSULTANT";

interface AIRequest {
  query: string;
  context?: string[]; // Content from documents
  mode: AgentMode;
  matterId: string;
}

interface AIResponse {
  answer: string;
  citations: Array<{ source: string; page: number; confidence: number }>;
  suggestedFollowUps: string[];
}

export type AnswerSentence = {
  text: string;
  citations: Array<{ source: string; page: number; confidence: number }>;
};

export type DirectAnswerResponse = {
  sentences: AnswerSentence[];
  summary: string;
};

export interface VerificationResult {
  passed: boolean;
  issues: string[];
  candidates: AIResponse[];
  selectedIndex: number;
}

export interface VerifiedAIResponse extends AIResponse {
  audit: VerificationResult;
}

export const GeminiService = {
  // The core function that all modules will call
  async processQuery(request: AIRequest): Promise<AIResponse> {
    console.log(`[Neural Network] Processing in mode: ${request.mode}`);

    // In a real build, this fetches from your backend (Python/Node).
    // For now, we simulate the "Neural" processing to ensure the frontend architecture holds up.
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockNeuralResponse(request));
      }, 2000); // Simulate "Thinking" time
    });
  },

  // System-2 verifier: generate multiple candidates, verify, and select
  async processQueryWithVerifier(request: AIRequest): Promise<VerifiedAIResponse> {
    const candidates = generateCandidates(request);
    const audit = verifyCandidates(candidates);
    const finalResponse = candidates[audit.selectedIndex];
    return { ...finalResponse, audit };
  }
  ,
  async processDirectAnswer(request: AIRequest): Promise<DirectAnswerResponse> {
    const base = mockNeuralResponse(request);
    const parts = base.answer
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length);
    const sentences: AnswerSentence[] = parts.map((text, idx) => ({
      text,
      citations: base.citations.slice(0, idx === 0 ? 2 : 1)
    }));
    return {
      sentences,
      summary: base.answer
    };
  }
};

export async function searchCaseLaw(query: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  Object.assign(headers, getCsrfHeader());
  const res = await fetch(`${getApiBase()}/research/search`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    return { results: [] };
  }
  return res.json();
}

export async function validateCitationApi(citation: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  Object.assign(headers, getCsrfHeader());
  const res = await fetch(`${getApiBase()}/research/validate`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ citation })
  });
  if (!res.ok) {
    return { status: "warn", negative_treatment: [] };
  }
  return res.json();
}

// --- SIMULATED NEURAL WEIGHTS ---
// This mocks how the AI changes its answer style based on the 'mode'
function mockNeuralResponse(req: AIRequest): AIResponse {
  const { mode, query } = req;

  if (mode === "MEDICAL_EXAMINER") {
    return {
      answer:
        "Based on the clinical documentation, the patient sustained a **C4-C5 herniation** consistent with whiplash trauma. The MRI dated 11/14/2025 confirms impingement on the thecal sac.",
      citations: [
        { source: "Oakland_Imaging_MRI.pdf", page: 2, confidence: 0.98 },
        { source: "Dr_Chen_Consult.pdf", page: 1, confidence: 0.92 }
      ],
      suggestedFollowUps: ["Check for pre-existing degeneration", "Summarize physical therapy gaps"]
    };
  }

  if (mode === "FORENSIC_ACCOUNTANT") {
    return {
      answer:
        "I detected a pattern of **structured withdrawals** in the Chase Bank statements. Three withdrawals of $9,500 occurred between Sept 12-14, avoiding the $10k reporting threshold.",
      citations: [
        { source: "Chase_Sept_Stmt.pdf", page: 4, confidence: 0.99 },
        { source: "Chase_Sept_Stmt.pdf", page: 5, confidence: 0.99 }
      ],
      suggestedFollowUps: ["Trace destination of cash", "Calculate total unreported income"]
    };
  }

  // Default: GENERAL_LEGAL
  return {
    answer: `Here is the analysis regarding "${query}". The evidence suggests a dispute over the timeline of events on the night of the incident.`,
    citations: [
      { source: "Police_Report_Final.pdf", page: 3, confidence: 0.85 },
      { source: "Witness_Statement_Jones.docx", page: 1, confidence: 0.75 }
    ],
    suggestedFollowUps: ["Draft a Motion in Limine", "Find contradictory testimony"]
  };
}

function generateCandidates(req: AIRequest): AIResponse[] {
  const base = mockNeuralResponse(req);
  const variantLowConfidence = {
    ...base,
    citations: base.citations.map((c) => ({ ...c, confidence: Math.max(0.55, c.confidence - 0.25) })),
    answer: `${base.answer} (Alt view: verify chain-of-custody before relying.)`
  };
  const variantHighConfidence = {
    ...base,
    citations: base.citations.map((c) => ({ ...c, confidence: Math.min(0.99, c.confidence + 0.05) })),
    answer: `${base.answer} (Validated against primary exhibits.)`
  };
  return [base, variantLowConfidence, variantHighConfidence];
}

function verifyCandidates(candidates: AIResponse[]): VerificationResult {
  const issues: string[] = [];
  let selectedIndex = 0;

  const passIndex = candidates.findIndex((c) => {
    if (!c.citations || c.citations.length === 0) return false;
    return c.citations.every((cite) => cite.confidence >= 0.8);
  });

  if (passIndex === -1) {
    issues.push("No candidate met citation confidence threshold (>= 0.8).");
    selectedIndex = 0;
  } else {
    selectedIndex = passIndex;
  }

  return {
    passed: passIndex !== -1,
    issues,
    candidates,
    selectedIndex
  };
}
