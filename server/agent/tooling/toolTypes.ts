export type ToolRisk = "low" | "medium" | "high" | "critical";

export type ToolContext = {
  workspaceId: string;
  userId: string;
  repoRoot: string;
  dryRun: boolean;
  remember: (note: string) => Promise<void>;
};

export type ToolResult = {
  ok: boolean;
  output: string;
  data?: Record<string, unknown>;
  truncated?: boolean;
};

export type ToolHandler = (args: Record<string, any>, ctx: ToolContext) => Promise<ToolResult>;

export type ToolDefinition = {
  name: string;
  description: string;
  risk: ToolRisk;
  argsSchema: string;
  handler: ToolHandler;
};
