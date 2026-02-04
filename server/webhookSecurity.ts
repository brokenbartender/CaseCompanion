type WebhookFetch = typeof fetch;

export const WEBHOOK_TIMEOUT_MS = 5000;

export function resolveIntakeWebhookUrl(raw: string, nodeEnv: string) {
  if (!raw) {
    throw new Error('Security Error: Webhook URL missing.');
  }
  const url = new URL(raw);

  if (url.protocol !== 'https:') {
    throw new Error('Security Error: Webhook URL must use HTTPS.');
  }

  const hostname = url.hostname;
  const isLocal = hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.startsWith('192.168.');

  if (isLocal && nodeEnv === 'production') {
    throw new Error('Security Error: Internal network egress prohibited.');
  }

  return url;
}

export async function sendIntakeWebhook(raw: string, payload: Record<string, unknown>, opts?: {
  fetchImpl?: WebhookFetch;
  timeoutMs?: number;
  nodeEnv?: string;
}) {
  const nodeEnv = opts?.nodeEnv ?? (String(process.env.NODE_ENV || '').trim() || 'development');
  const url = resolveIntakeWebhookUrl(raw, nodeEnv);
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const timeoutMs = opts?.timeoutMs ?? WEBHOOK_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const signingSecret = String(process.env.WEBHOOK_SIGNING_SECRET || '').trim();
  if (signingSecret) {
    const crypto = await import('crypto');
    const signature = crypto.createHmac('sha256', signingSecret).update(body).digest('hex');
    headers['X-LexiPro-Signature'] = signature;
  }
  try {
    await fetchImpl(url.toString(), {
      method: 'POST',
      headers,
      body,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}
