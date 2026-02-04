import { useCallback, useState } from "react";
import { api } from "../services/api";
import { getWorkspaceId } from "../services/authStorage";
import { logForensicEvent } from "../services/forensicLogger";
import { useMatterId } from "./useMatterId";

type ModuleAIState = {
  loading: boolean;
  output: string | null;
  error: string | null;
};

function extractText(result: any): string {
  if (!result) return "No output returned.";
  if (typeof result === "string") return result;
  if (typeof result === "object") {
    return (
      result?.answer ||
      result?.content ||
      result?.response ||
      result?.summary ||
      JSON.stringify(result, null, 2)
    );
  }
  return String(result);
}

export function useModuleAI(promptKey: string) {
  const matterId = useMatterId();
  const [state, setState] = useState<ModuleAIState>({
    loading: false,
    output: null,
    error: null
  });

  const run = useCallback(
    async (userPrompt: string) => {
      const workspaceId = getWorkspaceId();
      setState((prev) => ({ ...prev, loading: true, error: null }));
      await logForensicEvent("module.ai.run", { promptKey, matterId, workspaceId, userPrompt });
      try {
        const result = await api.post("/ai/chat", {
          userPrompt,
          promptKey,
          workspaceId,
          matterId
        });
        setState({ loading: false, output: extractText(result), error: null });
      } catch (err: any) {
        setState({ loading: false, output: null, error: err?.message || "AI request failed." });
      }
    },
    [matterId, promptKey]
  );

  return { ...state, run };
}
