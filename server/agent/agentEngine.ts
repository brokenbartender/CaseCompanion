import { agentCore } from "./agentCore.js";
import { agentTaskQueue } from "./state/taskQueue.js";

export type AgentTraceStep = {
  type: "thought" | "action" | "observation" | "final";
  content: string;
};

function buildTraceFromLogs(logs: AgentTraceStep[]): AgentTraceStep[] {
  return logs.length ? logs : [];
}

function normalizeStep(step: { type: string; content: string }): AgentTraceStep {
  const allowed: AgentTraceStep["type"][] = ["thought", "action", "observation", "final"];
  const type = allowed.includes(step.type as AgentTraceStep["type"]) ? (step.type as AgentTraceStep["type"]) : "observation";
  return { type, content: step.content };
}

export const agentEngine = {
  async runAgent(workspaceId: string, userId: string, userGoal: string, _matterId?: string) {
    return agentTaskQueue.enqueue(async () => {
      const trace: AgentTraceStep[] = [];
      const result = await agentCore.run({
        workspaceId,
        userId,
        goal: userGoal,
        onStep: (step) => trace.push(normalizeStep(step))
      });
      return { answer: result.answer, trace: [...trace, { type: "final", content: result.answer }] };
    });
  },
  async runBuilderAgent(
    workspaceId: string,
    userId: string,
    userGoal: string,
    _role?: string,
    _memory?: string
  ) {
    return agentTaskQueue.enqueue(async () => {
      const trace: AgentTraceStep[] = [];
      const result = await agentCore.run({
        workspaceId,
        userId,
        goal: userGoal,
        role: "Builder",
        onStep: (step) => trace.push(normalizeStep(step))
      });
      return { answer: result.answer, trace: [...trace, { type: "final", content: result.answer }] };
    });
  },
  async runAgentStream(
    workspaceId: string,
    userId: string,
    userGoal: string,
    onStep: (step: AgentTraceStep) => void,
    toolGate?: (args: { action: string; input: string }) => Promise<{ approved: boolean; reason?: string }>,
    _matterId?: string
  ) {
    return agentTaskQueue.enqueue(async () => {
      const logs: AgentTraceStep[] = [];
      const result = await agentCore.run({
        workspaceId,
        userId,
        goal: userGoal,
        toolGate,
        onStep: (step) => {
          const normalized = normalizeStep(step);
          logs.push(normalized);
          onStep(normalized);
        }
      });
      const trace = buildTraceFromLogs(logs);
      onStep({ type: "final", content: result.answer });
      return { answer: result.answer, trace: [...trace, { type: "final", content: result.answer }] };
    });
  },
  async runAgentResume(workspaceId: string, userId: string, userGoal: string) {
    return this.runAgent(workspaceId, userId, userGoal);
  },
  async runAgentStreamResume(
    workspaceId: string,
    userId: string,
    userGoal: string,
    _resumeState: { history: string; stepIndex: number },
    onStep: (step: AgentTraceStep) => void
  ) {
    return this.runAgentStream(workspaceId, userId, userGoal, onStep);
  },
  async runAgentPlan(workspaceId: string, userId: string, userGoal: string) {
    return agentTaskQueue.enqueue(async () => {
      const steps = [
        "Request Security Footage",
        "Depose Store Manager",
        "Inspect Incident Scene",
        "Collect Maintenance Logs",
        "Draft Request for Production"
      ];
      return {
        goal: userGoal,
        steps,
        trace: [{ type: "thought", content: `Generated ${steps.length} steps for ${userGoal}.` }]
      };
    });
  },
  async runAgentExecuteStep(
    workspaceId: string,
    userId: string,
    userGoal: string,
    step: string
  ) {
    return agentTaskQueue.enqueue(async () => {
      const doc = `Request for Production - ${step}\n\nPlease produce all responsive records relevant to ${step.toLowerCase()}.`;
      return {
        goal: userGoal,
        step,
        document: doc,
        trace: [
          { type: "action", content: `Executed step: ${step}` },
          { type: "final", content: doc }
        ]
      };
    });
  }
};
