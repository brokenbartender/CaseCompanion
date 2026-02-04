import { ToolRegistry } from "./toolRegistry.js";
import { DEFAULT_TOOLS } from "./tools.js";

export function buildDefaultRegistry() {
  const registry = new ToolRegistry();
  for (const tool of DEFAULT_TOOLS) {
    registry.register(tool);
  }
  return registry;
}

export { ToolRegistry } from "./toolRegistry.js";
export type { ToolDefinition, ToolContext, ToolResult, ToolRisk } from "./toolTypes.js";
