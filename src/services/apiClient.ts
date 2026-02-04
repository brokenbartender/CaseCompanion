export type ApiConfig = {
  apiBase: string;
  workspaceId: string;
  authToken: string;
};

export async function uploadExhibit(config: ApiConfig, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${config.apiBase}/api/workspaces/${config.workspaceId}/exhibits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.authToken}`
    },
    body: form
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed: ${res.status}`);
  }
  return res.json();
}
