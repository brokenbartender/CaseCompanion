type GovernanceConfig = {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  policyId: string;
  resourceId: string;
};

type GovernanceEvaluation = {
  principal: string;
  action: string;
  metadata?: Record<string, any>;
};

const DEFAULT_TIMEOUT_MS = 5000;

function readConfig(): GovernanceConfig | null {
  const enabled = String(process.env.GOV_ENABLED || '').toLowerCase();
  if (!['1', 'true', 'yes', 'on'].includes(enabled)) return null;

  const baseUrl = String(process.env.GOV_BASE_URL || '').trim();
  const apiKey = String(process.env.GOV_API_KEY || '').trim();
  const policyId = String(process.env.GOV_POLICY_ID || '').trim();
  const resourceId = String(process.env.GOV_RESOURCE_ID || '').trim();

  if (!baseUrl || !apiKey || !policyId || !resourceId) return null;

  return { enabled: true, baseUrl, apiKey, policyId, resourceId };
}

export async function logGovernanceEvaluation(payload: GovernanceEvaluation) {
  const config = readConfig();
  if (!config) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    await fetch(`${config.baseUrl.replace(/\/$/, '')}/evaluations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify({
        policy_id: config.policyId,
        resource_id: config.resourceId,
        principal: payload.principal,
        action: payload.action,
        metadata: payload.metadata || {}
      }),
      signal: controller.signal
    });
  } catch (err: any) {
    console.warn('GOVERNANCE_EVAL_FAILED', err?.message || String(err));
  } finally {
    clearTimeout(timeout);
  }
}
