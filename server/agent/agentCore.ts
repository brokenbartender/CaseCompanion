import { localAiService } from "../services/localAiService.js";
import { agentStateStore } from "./state/agentStateStore.js";
import { buildDefaultRegistry } from "./tooling/index.js";
import { assessToolCall } from "./tooling/policy.js";
import type { ToolContext, ToolDefinition } from "./tooling/toolTypes.js";
import { forensicTools } from "./tools.js";

type PlanStep = {
  id: string;
  description: string;
  tool: string;
  args: Record<string, any>;
  rationale?: string;
};

type PlanResult = {
  summary: string;
  steps: PlanStep[];
};

type ToolGate = (args: { action: string; input: string }) => Promise<{ approved: boolean; reason?: string }>;

const MAX_STEPS = Number(process.env.AGENT_MAX_STEPS || 8);
const MAX_RESULT_CHARS = 8000;

function extractJson(raw: string) {
  const text = raw.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function summarizeTools(tools: ToolDefinition[]) {
  return tools
    .map((tool) => `- ${tool.name}: ${tool.description} args=${tool.argsSchema}`)
    .join("\n");
}

function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s)]+/i);
  return match ? match[0] : null;
}

async function planGoal(goal: string, tools: ToolDefinition[], memory: string, role?: string) {
  const system = [
    "You are the LexiPro Desktop Agent Planner.",
    "Create a minimal, safe execution plan using ONLY the allowed tools.",
    "Return JSON: { summary: string, steps: [{ id, description, tool, args, rationale }] }",
    "Rules:",
    "- Use at most " + MAX_STEPS + " steps.",
    "- Only use tools listed below.",
    "- args must be valid JSON objects.",
    "- If information is missing, use tool=respond with a question."
  ].join("\n");

  const prompt = [
    system,
    "",
    role ? `Role focus: ${role}` : "",
    memory ? `Memory: ${memory}` : "",
    "Allowed tools:",
    summarizeTools(tools),
    "",
    `Goal: ${goal}`
  ].filter(Boolean).join("\n");

  const raw = await localAiService.generate(prompt, { temperature: 0.1, stop: [] });
  const parsed = extractJson(raw);
  if (!parsed || !Array.isArray(parsed.steps)) {
    return {
      summary: "Fallback plan",
      steps: [
        {
          id: "step-1",
          description: "Ask for clarification",
          tool: "respond",
          args: { text: "I need more details to proceed. What exactly should I do first?" },
          rationale: "Missing plan"
        }
      ]
    } satisfies PlanResult;
  }
  const steps = parsed.steps.slice(0, MAX_STEPS).map((step: any, idx: number) => ({
    id: String(step.id || `step-${idx + 1}`),
    description: String(step.description || step.tool || `step-${idx + 1}`),
    tool: String(step.tool || "").trim(),
    args: typeof step.args === "object" && step.args ? step.args : {},
    rationale: step.rationale ? String(step.rationale) : undefined
  }));
  let plan: PlanResult = {
    summary: String(parsed.summary || "Planned execution"),
    steps
  };

  const url = extractFirstUrl(goal);
  if (url && tools.some((tool) => tool.name === "capture_web_evidence")) {
    const hasCapture = plan.steps.some((step) => step.tool === "capture_web_evidence");
    if (!hasCapture) {
      plan = {
        summary: plan.summary,
        steps: [
          {
            id: "step-0",
            description: "Capture web evidence for chain of custody",
            tool: "capture_web_evidence",
            args: { input: url },
            rationale: "Preserve evidence before analysis."
          },
          ...plan.steps
        ].slice(0, MAX_STEPS)
      };
    }
  }

  return plan;
}

async function synthesize(goal: string, steps: Array<{ description: string; output: string }>) {
  const condensed = steps
    .map((step, idx) => `${idx + 1}. ${step.description}\n${step.output}`)
    .join("\n\n");
  const prompt = [
    "You are the LexiPro Desktop Agent.",
    "Summarize the completed work and provide the final response.",
    "Keep it concise and action-oriented.",
    "",
    `Goal: ${goal}`,
    "Observations:",
    condensed
  ].join("\n");
  const text = await localAiService.generate(prompt, { temperature: 0.1, stop: [] });
  return text.slice(0, MAX_RESULT_CHARS);
}

export const agentCore = {
  async run(args: {
    workspaceId: string;
    userId: string;
    goal: string;
    toolGate?: ToolGate;
    onStep?: (step: { type: string; content: string }) => void;
    role?: string;
    dryRun?: boolean;
  }) {
    const { workspaceId, userId, goal, toolGate, onStep, role, dryRun = false } = args;
    const task = await agentStateStore.startTask(workspaceId, userId, goal);
    const registry = buildDefaultRegistry();
    for (const tool of forensicTools) {
      registry.register({
        name: tool.name,
        description: tool.description,
        risk: "medium",
        argsSchema: "{ input: string }",
        handler: async (args, ctx) => {
          const input = typeof args?.input === "string" ? args.input : JSON.stringify(args || "");
          const output = await tool.execute(String(input || ""), ctx.workspaceId);
          return { ok: true, output: String(output || "") };
        }
      });
    }
    const memory = await agentStateStore.getMemory(workspaceId, userId);
    const memorySummary = memory.notes.slice(-6).join(" | ");
    const tools = registry.list();

    onStep?.({ type: "thought", content: "Planning execution steps..." });
    await agentStateStore.appendLog(workspaceId, userId, task.id, "Planning execution steps.");
    await agentStateStore.logEvent(workspaceId, userId, "PLAN_START", goal);

    let plan: PlanResult;
    try {
      plan = await planGoal(goal, tools, memorySummary, role);
    } catch (err: any) {
      plan = {
        summary: "Planner unavailable",
        steps: [
          {
            id: "step-1",
            description: "Provide fallback response",
            tool: "respond",
            args: { text: `Planner unavailable: ${err?.message || "unknown error"}` },
            rationale: "Fallback"
          }
        ]
      };
    }
    task.summary = plan.summary;
    task.steps = plan.steps.map((step) => ({
      id: step.id,
      description: step.description,
      tool: step.tool,
      args: step.args,
      status: "PENDING"
    }));
    task.status = "RUNNING";
    await agentStateStore.updateTask(workspaceId, userId, task);
    onStep?.({ type: "thought", content: `Plan: ${plan.summary}` });
    await agentStateStore.logEvent(workspaceId, userId, "PLAN_READY", plan.summary);

    const stepOutputs: Array<{ description: string; output: string }> = [];
    for (const step of plan.steps) {
      const stepRecord = task.steps.find((s) => s.id === step.id);
      const tool = registry.get(step.tool);
      if (!tool) {
        const msg = `Unknown tool: ${step.tool}`;
        onStep?.({ type: "observation", content: msg });
        stepOutputs.push({ description: step.description, output: msg });
        if (stepRecord) {
          stepRecord.status = "FAILED";
          stepRecord.output = msg;
        }
        await agentStateStore.updateTask(workspaceId, userId, task);
        continue;
      }

      const policy = assessToolCall(tool, step.args);
      if (policy.requiresApproval && toolGate) {
        const decision = await toolGate({ action: tool.name, input: JSON.stringify(step.args) });
        if (!decision.approved) {
          const reason = decision.reason || "Approval rejected.";
          onStep?.({ type: "observation", content: `Approval denied for ${tool.name}: ${reason}` });
          stepOutputs.push({ description: step.description, output: `Approval denied: ${reason}` });
          if (stepRecord) {
            stepRecord.status = "SKIPPED";
            stepRecord.output = `Approval denied: ${reason}`;
          }
          task.status = "CANCELLED";
          await agentStateStore.updateTask(workspaceId, userId, task);
          return {
            answer: `Execution halted: ${reason}`,
            trace: []
          };
        }
      } else if (policy.requiresApproval && !toolGate) {
        const msg = `Approval required for ${tool.name} but no approval channel is available.`;
        onStep?.({ type: "observation", content: msg });
        stepOutputs.push({ description: step.description, output: msg });
        if (stepRecord) {
          stepRecord.status = "SKIPPED";
          stepRecord.output = msg;
        }
        task.status = "FAILED";
        await agentStateStore.updateTask(workspaceId, userId, task);
        return { answer: msg, trace: [] };
      }

      const ctx: ToolContext = {
        workspaceId,
        userId,
        repoRoot: process.cwd(),
        dryRun,
        remember: async (note: string) => {
          await agentStateStore.remember(workspaceId, userId, note);
        }
      };

      onStep?.({ type: "action", content: `${tool.name} ${JSON.stringify(step.args)}` });
      await agentStateStore.appendLog(workspaceId, userId, task.id, `Executing ${tool.name}`);
      await agentStateStore.logEvent(workspaceId, userId, "TOOL_EXEC", tool.name);

      try {
        const result = await tool.handler(step.args, ctx);
        const output = result.output || "ok";
        stepOutputs.push({ description: step.description, output });
        onStep?.({ type: "observation", content: output });
        if (stepRecord) {
          stepRecord.status = result.ok ? "DONE" : "FAILED";
          stepRecord.output = output;
        }
        await agentStateStore.updateTask(workspaceId, userId, task);
      } catch (err: any) {
        const msg = `Tool ${tool.name} failed: ${err?.message || String(err)}`;
        stepOutputs.push({ description: step.description, output: msg });
        onStep?.({ type: "observation", content: msg });
        if (stepRecord) {
          stepRecord.status = "FAILED";
          stepRecord.output = msg;
        }
        await agentStateStore.updateTask(workspaceId, userId, task);
      }
    }

    task.status = "COMPLETED";
    await agentStateStore.updateTask(workspaceId, userId, task);
    await agentStateStore.logEvent(workspaceId, userId, "TASK_DONE", goal);
    const finalAnswer = await synthesize(goal, stepOutputs);
    return { answer: finalAnswer, trace: [] };
  }
};
