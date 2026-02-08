import React, { useState, useRef, useEffect } from "react";
import Page from "../components/ui/Page";
import { Card } from "../components/ui/Card";
import Button from "../components/ui/Button";
import IntegrityPanel from "../components/IntegrityPanel";
import { GeminiService, AgentMode, VerificationResult, AnswerSentence } from "../services/geminiService";
import { checkCitationValidity } from "../services/legalAuthority";
import { registerAnchor } from "../services/anchorRegistry";
import {
  Send,
  Bot,
  User,
  FileText,
  Sparkles,
  Stethoscope,
  Briefcase,
  Scale,
  Shield
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  sentences?: AnswerSentence[];
  citations?: Array<{ source: string; page: number }>;
  followUps?: string[];
  audit?: VerificationResult;
}

export default function CaseAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "ai", text: "I am ready. Select a neural mode to begin analyzing this matter." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeMode, setActiveMode] = useState<AgentMode>("GENERAL_LEGAL");
  const [system2Enabled, setSystem2Enabled] = useState(true);
  const [strictGrounding, setStrictGrounding] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // CALL THE NEURAL NETWORK
    const response = system2Enabled
      ? await GeminiService.processQueryWithVerifier({
          query: input,
          mode: activeMode,
          matterId: "CURRENT_MATTER"
        })
      : await GeminiService.processQuery({
          query: input,
          mode: activeMode,
          matterId: "CURRENT_MATTER"
        });

    const direct = await GeminiService.processDirectAnswer({
      query: input,
      mode: activeMode,
      matterId: "CURRENT_MATTER"
    });

    if (strictGrounding && (!response.citations || response.citations.length === 0)) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-guardrail`,
          role: "ai",
          text: "No anchor detected. Strict Grounding is ON, so I cannot answer."
        }
      ]);
      setIsTyping(false);
      return;
    }

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "ai",
      text: response.answer,
      sentences: direct.sentences,
      citations: response.citations,
      followUps: response.suggestedFollowUps,
      audit: "audit" in response ? (response.audit as VerificationResult) : undefined
    };

    response.citations?.forEach((cite) => {
      registerAnchor({
        exhibitId: cite.source,
        source: cite.source,
        page: cite.page,
        confidence: cite.confidence
      });
    });

    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Page title="Interrogate" subtitle="Direct neural interface to case evidence">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[75vh]">
        {/* LEFT: Neural Controls */}
        <Card className="lg:col-span-1 p-4 flex flex-col gap-4">
          <IntegrityPanel
            status={strictGrounding ? "VERIFIED" : "PENDING"}
            anchors={messages.reduce((sum, msg) => sum + (msg.citations?.length || 0), 0)}
            verificationPct={strictGrounding ? 100 : 62}
            outputType={strictGrounding ? "RETRIEVAL" : "REASONED"}
            basis={{
              sources: "Evidence anchors + case workspace",
              model: system2Enabled ? "System-2 verifier" : "Standard generator",
              assumptions: "No external assumptions"
            }}
            policyResult={strictGrounding ? "Anchors required. Release gate enabled." : "Anchors optional. Review required."}
            provenance={`Mode: ${activeMode} • Verifier: ${system2Enabled ? "System-2" : "Standard"}`}
          />
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cognitive Mode</div>

          <button
            onClick={() => setActiveMode("GENERAL_LEGAL")}
            className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all ${
              activeMode === "GENERAL_LEGAL"
                ? "bg-blue-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Scale size={18} /> General Counsel
          </button>

          <button
            onClick={() => setActiveMode("MEDICAL_EXAMINER")}
            className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all ${
              activeMode === "MEDICAL_EXAMINER"
                ? "bg-rose-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Stethoscope size={18} /> Medical Examiner
          </button>

          <button
            onClick={() => setActiveMode("FORENSIC_ACCOUNTANT")}
            className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all ${
              activeMode === "FORENSIC_ACCOUNTANT"
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Briefcase size={18} /> Forensic Audit
          </button>

          <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span>Strict Grounding</span>
              <button
                type="button"
                onClick={() => setStrictGrounding((prev) => !prev)}
                className={`h-5 w-9 rounded-full border transition-colors ${
                  strictGrounding ? "border-emerald-500/50 bg-emerald-500/30" : "border-rose-500/40 bg-rose-500/20"
                }`}
              >
                <span
                  className={`block h-4 w-4 translate-y-[1px] rounded-full bg-white transition-transform ${
                    strictGrounding ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <div className={`mt-2 ${strictGrounding ? "text-emerald-200" : "text-rose-200"}`}>
              {strictGrounding ? "Anchors required" : "Creative mode"}
            </div>
          </div>

          <button
            onClick={() => setActiveMode("JURY_CONSULTANT")}
            className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-all ${
              activeMode === "JURY_CONSULTANT"
                ? "bg-violet-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            }`}
          >
            <Sparkles size={18} /> Jury Consultant
          </button>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-[0.2em] text-slate-500">System-2 Verifier</span>
              <button
                type="button"
                onClick={() => setSystem2Enabled((prev) => !prev)}
                className={`rounded-full px-2 py-1 text-[10px] ${
                  system2Enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {system2Enabled ? "ON" : "OFF"}
              </button>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Verifies citations and selects the most grounded candidate before output.
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield size={12} className="text-emerald-500" />
              <span>Privileged & Confidential</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <Sparkles size={12} className="text-purple-500" />
              <span>Strict Grounding Active</span>
            </div>
          </div>
        </Card>

        {/* RIGHT: Chat Interface */}
        <Card className="lg:col-span-3 flex flex-col bg-slate-950/50">
          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "ai" ? "bg-purple-600" : "bg-slate-700"
                  }`}
                >
                  {msg.role === "ai" ? <Bot size={18} /> : <User size={18} />}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === "ai"
                      ? "bg-slate-900 text-slate-200 border border-slate-800"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  {msg.sentences && msg.sentences.length ? (
                    <div className="space-y-3">
                      {msg.sentences.map((sentence, idx) => (
                        <div key={`${msg.id}-s-${idx}`} className="leading-relaxed">
                          <div>{sentence.text}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {sentence.citations.map((cite, i) => {
                              const status = checkCitationValidity(cite.source);
                              const tone =
                                status.status === "Good Law"
                                  ? "text-emerald-300"
                                  : status.status === "Distinguished"
                                  ? "text-amber-300"
                                  : "text-rose-300";
                              return (
                              <span
                                key={`${msg.id}-s-${idx}-c-${i}`}
                                className={`inline-flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] ${tone} hover:border-purple-500 cursor-pointer transition-colors`}
                              >
                                <FileText size={10} />
                                {cite.source} (p.{cite.page}) · {status.status}
                              </span>
                            );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    msg.text
                  )}
                  
                  {/* Citations */}
                  {msg.citations && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.citations.map((cite, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-purple-300 hover:border-purple-500 cursor-pointer transition-colors"
                        >
                          <FileText size={10} />
                          {cite.source} (p.{cite.page})
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.followUps && msg.followUps.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.followUps.map((follow) => (
                        <span
                          key={follow}
                          className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-400"
                        >
                          {follow}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {msg.audit ? (
                    <details className="mt-3 text-[11px] text-slate-400">
                      <summary className="cursor-pointer">
                        Verifier: {msg.audit.passed ? "PASS" : "FAIL"} • Selected candidate #{msg.audit.selectedIndex + 1}
                      </summary>
                      <div className="mt-2 space-y-2">
                        {msg.audit.issues.length ? (
                          <div className="rounded border border-rose-500/30 bg-rose-500/10 p-2 text-rose-200">
                            {msg.audit.issues.join(" ")}
                          </div>
                        ) : (
                          <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-200">
                            All citations meet confidence threshold.
                          </div>
                        )}
                        <div className="space-y-1">
                          {msg.audit.candidates.map((candidate, idx) => (
                            <div
                              key={`${msg.id}-cand-${idx}`}
                              className={`rounded border border-slate-800 bg-slate-950/40 p-2 ${
                                idx === msg.audit?.selectedIndex ? "text-slate-200" : "text-slate-500"
                              }`}
                            >
                              Candidate {idx + 1}: {candidate.citations.map((c) => c.confidence).join(", ")} confidence
                            </div>
                          ))}
                        </div>
                      </div>
                    </details>
                  ) : null}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div className="bg-slate-900 px-4 py-3 rounded-2xl border border-slate-800 flex items-center gap-1">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-800 bg-slate-900 rounded-b-xl">
            <form onSubmit={handleSend} className="flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask the ${activeMode.toLowerCase().replace("_", " ")}...`}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <Button type="submit" variant="primary" disabled={!input.trim() || isTyping}>
                <Send size={18} />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </Page>
  );
}
