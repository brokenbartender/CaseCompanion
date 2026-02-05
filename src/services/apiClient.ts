export type ApiConfig = {
  apiBase: string;
  workspaceId: string;
  authToken: string;
};

export async function uploadExhibit(config: ApiConfig, file: File) {
  const form = new FormData();
  form.append("file", file);
  const lower = file.name.toLowerCase();
  const tags: string[] = [];
  if (/(police|report|ocso)/.test(lower)) tags.push("police-report");
  if (/(medical|er|hospital|trinity|bill|invoice)/.test(lower)) tags.push("medical");
  if (/(video|footage|clip)/.test(lower) || /(mp4|mov|avi|mkv)$/.test(lower)) tags.push("video");
  if (/(witness|statement)/.test(lower)) tags.push("witness");
  if (tags.length) {
    form.append("tags", tags.join(","));
  }
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
