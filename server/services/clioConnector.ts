export type ClioSuggestion = {
  id: string;
  message: string;
  detectedAt: string;
};

export async function getClioSuggestions(workspaceId: string): Promise<ClioSuggestion[]> {
  const timestamp = new Date().toISOString();
  return [
    {
      id: `${workspaceId}-clio-1`,
      message: "Unverified document found in Clio: Should I perform forensic anchoring?",
      detectedAt: timestamp
    }
  ];
}
