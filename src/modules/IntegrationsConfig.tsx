import { useState } from "react";

const providers = [
  { id: "clio", name: "Clio", description: "Practice management" },
  { id: "google-drive", name: "Google Drive", description: "Documents & matter folders" },
  { id: "email", name: "Email", description: "Outlook / Gmail inbox" }
];

type IntegrationState = {
  connected: boolean;
  lastSync?: string;
};

export function IntegrationsConfig() {
  const [state, setState] = useState<Record<string, IntegrationState>>({});

  const toggleProvider = (id: string) => {
    setState((prev) => {
      const current = prev[id];
      const nextConnected = !current?.connected;
      return {
        ...prev,
        [id]: {
          connected: nextConnected,
          lastSync: nextConnected ? new Date().toLocaleString() : undefined
        }
      };
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Connected Apps</h2>
        <p className="text-sm text-slate-500">
          Link external legal tools to sync documents into your workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => {
          const status = state[provider.id];
          return (
            <div key={provider.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{provider.name}</h3>
                  <p className="text-sm text-slate-500">{provider.description}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status?.connected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {status?.connected ? "Connected" : "Not Connected"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Last Sync: {status?.lastSync || "Never"}
                </div>
                <button
                  type="button"
                  onClick={() => toggleProvider(provider.id)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${status?.connected ? "bg-slate-200 text-slate-700" : "bg-indigo-600 text-white"}`}
                >
                  {status?.connected ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
