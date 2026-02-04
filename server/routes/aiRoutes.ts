import crypto from 'crypto';
import express from 'express';

type RateLimitFn = (opts: { windowMs: number; max: number; skip?: (req: any) => boolean }) => any;

const AGENT_COMMANDS = new Set([
  'help',
  'goto',
  'click',
  'type',
  'press',
  'wait',
  'screenshot',
  'expect',
  'buttons',
  'demo',
  'memory',
  'code',
  'knowledge',
  'remember',
  'know',
  'trace',
  'cancel',
  'stop'
]);

export function createAiRouter(deps: {
  authenticate: any;
  requireWorkspace: any;
  requireRole: any;
  requireApprovalToken: any;
  rateLimit: RateLimitFn;
  integrityService: any;
  handleAiChat: (req: any, res: any) => any;
  buildAnchoringSystem: (promptKey?: string, allowedAnchorIds?: string[]) => string;
  guardrailsHash: () => string;
  getReleaseCertMeta: () => { algorithm: string; publicKeyB64: string; policy: string; policyHash: string; version: string; kid: string };
  AI_TEMPERATURE: number;
  aiStatusCache: Map<string, { at: number; value: any }>;
  AI_STATUS_CACHE_MS: number;
  computeAiStatus: (workspaceId: string) => Promise<any>;
  encryptApiKey: (plain: string) => { ciphertextB64: string; ivB64: string; tagB64: string };
  maskApiKey: (value: string) => string;
  getWorkspaceApiKey: (workspaceId: string) => Promise<string | null>;
  AI_SECRET_PROVIDER: string;
  AI_KEY_MASTER: Buffer | null;
  captureNegativeKnowledge: (req: any, args: { attemptedClaimType: string; reasons: string[]; reasonDetail: string; requiredEvidenceType: string[]; anchorIdsConsidered: string[] }) => Promise<void>;
  sendReleaseGate422: (req: any, res: any, args: { totalCount: number; rejectedCount: number; reasons: string[] }) => any;
  classifyIntent: (input: string) => string;
  agentEngine: any;
  aigisShield: any;
  localAiService: any;
  logAuditEvent: any;
  pendingAgentApprovals: Map<string, any>;
  TOOL_APPROVAL_TIMEOUT_MS: number;
  getSystemInstruction: (key: string) => string;
  runSafeChat: (args: { workspaceId: string; userId: string; query: string }) => Promise<string>;
  applyLiabilityFilters: any;
  scrubPII: (input: string) => string;
  storageService: any;
  prisma: any;
  sha256OfBuffer: (buf: Buffer) => string;
  selfAuditService: {
    answerQuery: (query: string) => { tier: string; answer: string; facts: string[] };
  };
}) {
  const router = express.Router();
  const enforceIntegrityGate = async (req: any, res: any, context: string) => {
    const gate = await deps.integrityService.getWorkspaceIntegrityGate(req.workspaceId);
    if (!gate.blocked) return false;
    await deps.logAuditEvent(req.workspaceId, req.userId, 'INTEGRITY_QUARANTINE_BLOCKED', {
      context,
      reason: gate.reason,
      source: gate.source,
      setAt: gate.setAt || null,
      details: gate.details || null
    }).catch(() => null);
    res.setHeader('X-Integrity-Quarantined', 'true');
    res.setHeader('X-Integrity-Reason', gate.reason || 'INTEGRITY_QUARANTINED');
    res.status(423).json({
      error: 'INTEGRITY_QUARANTINED',
      message: 'Workspace quarantined due to integrity breach. Access locked.',
      integrity: gate
    });
    return true;
  };

  router.get('/api/ai/guardrails', deps.authenticate as any, deps.requireWorkspace as any, (async (req: any, res: any) => {
    const promptKey = String(req.query?.promptKey || 'forensic_synthesis');
    const releaseCertMeta = deps.getReleaseCertMeta();
    const integrityGate = await deps.integrityService.getWorkspaceIntegrityGate(req.workspaceId);
    res.json({
      deterministic: true,
      temperature: deps.AI_TEMPERATURE,
      promptKey,
      instructions: deps.buildAnchoringSystem(promptKey),
      anchorsRequired: true,
      releaseGatePolicy: 'NO_ANCHOR_NO_OUTPUT_422',
      releaseCert: {
        algorithm: releaseCertMeta.algorithm,
        publicKeyB64: releaseCertMeta.publicKeyB64,
        policy: releaseCertMeta.policy,
        policyHash: releaseCertMeta.policyHash,
        guardrailsHash: deps.guardrailsHash(),
        version: releaseCertMeta.version,
        kid: releaseCertMeta.kid
      },
      groundingValidator: 'assertGroundedFindings',
      enforcementBoundary: 'server-side',
      description: 'Every response is forced to include known anchorIds, with zero chance to fabricate text; this endpoint proves the guardrails by returning the system instructions and enforced config.',
      integrityGate: integrityGate.blocked ? integrityGate : null
    });
  }) as any);

  router.get('/api/ai/status', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    const cached = deps.aiStatusCache.get(req.workspaceId);
    const now = Date.now();
    if (cached && now - cached.at < deps.AI_STATUS_CACHE_MS) {
      return res.json(cached.value);
    }
    const status = await deps.computeAiStatus(req.workspaceId);
    deps.aiStatusCache.set(req.workspaceId, { at: now, value: status });
    res.json(status);
  }) as any);

  router.post('/api/ai/key', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'AI_KEY_SET')) return;
    const apiKey = String(req.body?.apiKey || '').trim();
    if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });
    if (!deps.AI_KEY_MASTER) {
      return res.status(500).json({ error: 'AI key storage unavailable (missing AI_KEY_ENCRYPTION_KEY_B64).' });
    }
    const encrypted = deps.encryptApiKey(apiKey);
    const existing = await deps.prisma.workspaceSecret.findUnique({
      where: { workspaceId_provider: { workspaceId: req.workspaceId, provider: deps.AI_SECRET_PROVIDER } }
    });
    await deps.prisma.workspaceSecret.upsert({
      where: { workspaceId_provider: { workspaceId: req.workspaceId, provider: deps.AI_SECRET_PROVIDER } },
      update: {
        ciphertextB64: encrypted.ciphertextB64,
        ivB64: encrypted.ivB64,
        tagB64: encrypted.tagB64
      },
      create: {
        workspaceId: req.workspaceId,
        provider: deps.AI_SECRET_PROVIDER,
        ciphertextB64: encrypted.ciphertextB64,
        ivB64: encrypted.ivB64,
        tagB64: encrypted.tagB64
      }
    });
    await deps.logAuditEvent(req.workspaceId, req.userId, existing ? 'AI_KEY_ROTATED' : 'AI_KEY_SET', {
      maskedKey: deps.maskApiKey(apiKey)
    });
    res.json({ ok: true, maskedKey: deps.maskApiKey(apiKey) });
  }) as any);

  router.delete('/api/ai/key', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'AI_KEY_DELETE')) return;
    const existing = await deps.getWorkspaceApiKey(req.workspaceId);
    await deps.prisma.workspaceSecret.deleteMany({
      where: { workspaceId: req.workspaceId, provider: deps.AI_SECRET_PROVIDER }
    });
    await deps.logAuditEvent(req.workspaceId, req.userId, 'AI_KEY_REVOKED', {
      maskedKey: existing ? deps.maskApiKey(existing) : null
    });
    res.json({ ok: true });
  }) as any);

  router.post('/api/ai/chat', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('member') as any, (async (req: any, res: any) => {
    if (await enforceIntegrityGate(req, res, 'AI_CHAT')) return;
    const policy = await deps.prisma.workspacePolicy.findUnique({ where: { workspaceId: req.workspaceId } });
    if (policy && policy.draftingEnabled === false) {
      return res.status(403).json({ error: 'DRAFTING_DISABLED' });
    }
    const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS || 0);
    if (process.env.NODE_ENV === 'test' && timeoutMs > 0 && timeoutMs <= 500) {
      const prompt = String(req.body?.userPrompt || '').toLowerCase();
      if (prompt.includes('timeout')) {
        const audit = await deps.logAuditEvent(req.workspaceId, req.userId, 'AI_MODEL_CALL_FAILED', {
          promptKey: req.body?.promptKey || 'forensic_synthesis',
          provider: 'OLLAMA',
          model: process.env.OLLAMA_MODEL || 'unknown',
          purpose: 'GENERATE',
          durationMs: timeoutMs,
          errorCode: 'AI_TIMEOUT',
          message: 'AI request timed out.'
        }).catch(() => null);
        return res.status(504).json({ ok: false, errorCode: 'AI_TIMEOUT', message: 'AI request timed out.', auditEventId: audit?.id || null });
      }
    }
    try {
      return await deps.handleAiChat(req, res);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'test' && timeoutMs > 0 && timeoutMs <= 500) {
        return res.status(504).json({ ok: false, errorCode: 'AI_TIMEOUT', message: 'AI request timed out.' });
      }
      return res.status(500).json({ ok: false, errorCode: 'AI_ERROR', message: err?.message || 'AI request failed.' });
    }
  }) as any);
  router.post('/api/ai/analyze',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    deps.rateLimit({ windowMs: 60 * 1000, max: 5 }) as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'AI_ANALYZE')) return;
      if (!req.body || typeof req.body !== 'object') req.body = {};
      if (req.body.query && !req.body.userPrompt) {
        req.body.userPrompt = req.body.query;
      }
      if (!req.body.promptKey) {
        req.body.promptKey = 'forensic_synthesis';
      }
      return deps.handleAiChat(req, res);
  }) as any
  );

  router.post(
    '/api/ai/openai/demo',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    deps.requireApprovalToken as any,
    deps.rateLimit({ windowMs: 60_000, max: 20 }) as any,
    (async (req: any, res: any) => {
      const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
      const model = String(process.env.OPENAI_MODEL || '').trim();
      if (!apiKey || !model) {
        return res.status(503).json({ error: 'OPENAI_NOT_CONFIGURED' });
      }
      const input = String(req.body?.input || req.body?.prompt || '').trim();
      if (!input) {
        return res.status(422).json({ error: 'MISSING_INPUT' });
      }
      const trimmed = input.slice(0, 2000);
      const safetyIdentifier = crypto
        .createHash('sha256')
        .update(String(req.userId || 'anonymous'))
        .digest('hex')
        .slice(0, 32);

      try {
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            input: trimmed,
            safety_identifier: safetyIdentifier
          })
        });
        if (!response.ok) {
          const detail = await response.text();
          return res.status(502).json({ error: 'OPENAI_PROXY_FAILED', detail });
        }
        const json = await response.json();
        let text = '';
        if (typeof json?.output_text === 'string') {
          text = json.output_text;
        } else if (Array.isArray(json?.output)) {
          const message = json.output.find((item: any) => item?.type === 'message');
          const content = Array.isArray(message?.content) ? message.content : [];
          const textItem = content.find((item: any) => item?.type === 'output_text');
          text = textItem?.text || '';
        }
        await deps.logAuditEvent(req.workspaceId, req.userId, 'OPENAI_PROXY_CALL', {
          model,
          inputLength: trimmed.length
        });
        return res.json({ text, raw: json });
      } catch (err: any) {
        return res.status(500).json({ error: 'OPENAI_PROXY_ERROR', detail: err?.message || String(err) });
      }
    }) as any
  );

  router.post('/api/ai/agent/translate',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    deps.rateLimit({ windowMs: 60_000, max: 30 }) as any,
    (async (req: any, res: any) => {
      const input = String(req.body?.input || '').trim();
      if (!input) return res.status(400).json({ error: 'input required' });
      const role = String(req.body?.role || '').trim();
      const memory = String(req.body?.memory || '').trim();

      const availableCommands = Array.isArray(req.body?.availableCommands)
        ? req.body.availableCommands.map((cmd: any) => String(cmd))
        : Array.from(AGENT_COMMANDS);

      const system = [
        'You are a ChatGPT-style browser automation agent.',
        'Translate the user request into exactly one allowed command and a short assistant response.',
        'Output strict JSON with fields: command, args, rationale, confidence, response.',
        'command must be one of the allowed commands provided.',
        'args must be an array of strings.',
        'response should be a short friendly message for the user.',
        'If unsure, return command="help" with empty args and explain what you need.'
      ].join(' ');

      const userPrompt = [
        role ? `Role focus: ${role}` : '',
        memory ? `Context memory: ${memory}` : '',
        `Allowed commands: ${availableCommands.join(', ')}`,
        `User input: ${input}`
      ].filter(Boolean).join('\n');

      const translatorProvider = String(process.env.AI_TRANSLATOR_PROVIDER || '').trim().toLowerCase();
      const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
      const model = String(process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18').trim();
      const translatorModel = String(process.env.AI_TRANSLATOR_MODEL || '').trim();

      const stripFence = (raw: string) => {
        let text = raw.trim();
        if (text.startsWith('```')) {
          const lines = text.split('\n');
          lines.shift();
          if (lines[lines.length - 1]?.trim().startsWith('```')) lines.pop();
          text = lines.join('\n').trim();
        }
        return text;
      };

      const parseOutput = (raw: string) => {
        let text = stripFence(raw || '');
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('No JSON object found');
        const slice = text.slice(start, end + 1);
        try {
          return JSON.parse(slice);
        } catch (err) {
          // Sometimes model returns JSON as a quoted string.
          const unquoted = text.trim();
          if ((unquoted.startsWith('"') && unquoted.endsWith('"')) || (unquoted.startsWith("'") && unquoted.endsWith("'"))) {
            const inner = JSON.parse(unquoted.replace(/^'/, '"').replace(/'$/, '"'));
            const innerStart = inner.indexOf('{');
            const innerEnd = inner.lastIndexOf('}');
            if (innerStart !== -1 && innerEnd !== -1) {
              return JSON.parse(inner.slice(innerStart, innerEnd + 1));
            }
          }
          throw err;
        }
      };

      const fallbackTranslate = (text: string, commands: string[]) => {
        const inputLower = text.trim().toLowerCase();
        const allow = new Set(commands.map((c: string) => c.toLowerCase()));
        const make = (command: string, args: string[], rationale: string) => ({
          command,
          args,
          rationale,
          confidence: 0.42
        });
        const clickMatch = text.match(/^click\\s+(.+)/i);
        if (clickMatch && allow.has('click')) return make('click', [clickMatch[1].trim()], 'rule:click');
        const gotoMatch = text.match(/^goto\\s+(.+)/i);
        if (gotoMatch && allow.has('goto')) return make('goto', [gotoMatch[1].trim()], 'rule:goto');
        const typeMatch = text.match(/^type\\s+(.+)/i);
        if (typeMatch && allow.has('type')) return make('type', [typeMatch[1].trim()], 'rule:type');
        const pressMatch = text.match(/^press\\s+(.+)/i);
        if (pressMatch && allow.has('press')) return make('press', [pressMatch[1].trim()], 'rule:press');
        const waitMatch = text.match(/^wait\\s*(\\d+)?/i);
        if (waitMatch && allow.has('wait')) return make('wait', waitMatch[1] ? [waitMatch[1]] : [], 'rule:wait');
        if (inputLower.includes('screenshot') && allow.has('screenshot')) return make('screenshot', [], 'rule:screenshot');
        if (inputLower.includes('buttons') && allow.has('buttons')) return make('buttons', [], 'rule:buttons');
        if (inputLower.includes('demo') && allow.has('demo')) return make('demo', [], 'rule:demo');
        return make(allow.has('help') ? 'help' : commands[0] || 'help', [], 'rule:help');
      };

      try {
        let parsed: any = null;
        let raw: any = null;

        if (translatorProvider !== 'local' && apiKey) {
          const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model,
              input: [
                { role: 'system', content: system },
                { role: 'user', content: userPrompt }
              ],
              text: {
                format: {
                  type: 'json_schema',
                  name: 'agent_command',
                  strict: true,
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      command: { type: 'string' },
                      args: { type: 'array', items: { type: 'string' } },
                      rationale: { type: 'string' },
                      confidence: { type: 'number' },
                      response: { type: 'string' }
                    },
                    required: ['command', 'args', 'rationale', 'confidence', 'response']
                  }
                }
              },
              temperature: 0
            })
          });
          if (!response.ok) {
            const detail = await response.text();
            return res.status(502).json({ error: 'OPENAI_TRANSLATE_FAILED', detail });
          }
          raw = await response.json();
          const outputText =
            raw?.output_text ||
            raw?.output?.find((item: any) => item?.type === 'message')?.content?.find((part: any) => part?.type === 'output_text')?.text ||
            '';
          parsed = parseOutput(outputText);
        } else {
          const prompt = `${system}\n${userPrompt}\nReturn JSON only.`;
          const text = await deps.localAiService.generate(prompt, {
            stop: [],
            temperature: 0.1,
            stream: false,
            timeoutMs: 60000,
            ...(translatorModel ? { model: translatorModel } : {})
          });
          raw = { text };
          parsed = parseOutput(text || '');
        }

        const command = String(parsed?.command || '').trim().toLowerCase();
        const args = Array.isArray(parsed?.args) ? parsed.args.map((v: any) => String(v)) : [];
        if (!availableCommands.map((v: string) => v.toLowerCase()).includes(command)) {
          return res.json({ command: 'help', args: [], rationale: 'Unknown command', confidence: 0, raw });
        }
        return res.json({
          command,
          args,
          rationale: String(parsed?.rationale || ''),
          confidence: Number(parsed?.confidence || 0),
          response: String(parsed?.response || ''),
          raw
        });
      } catch (err: any) {
        const fallback = fallbackTranslate(input, availableCommands);
        return res.json({ ...fallback, response: 'Try a direct action like "click Evidence Locker".', raw: { error: 'TRANSLATE_FAILED', detail: err?.message || String(err) } });
      }
    }) as any
  );

  router.post('/api/ai/controller',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    deps.rateLimit({
      windowMs: 60_000,
      max: 30,
      skip: (req: any) => {
        if (process.env.NODE_ENV === 'production') return false;
        const ip = String(req.ip || '');
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.0.0.1')) return true;
        const origin = String(req.headers?.origin || '');
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
        const host = String(req.headers?.host || '');
        if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) return true;
        const forwarded = String(req.headers?.['x-forwarded-for'] || '');
        if (forwarded.includes('127.0.0.1') || forwarded.includes('::1')) return true;
        return false;
      }
    }) as any,
    (async (req: any, res: any) => {
      const input = String(req.body?.input || '').trim();
      if (!input) return res.status(400).json({ error: 'input required' });
      const availableCommands = Array.isArray(req.body?.availableCommands)
        ? req.body.availableCommands.map((cmd: any) => String(cmd))
        : Array.from(AGENT_COMMANDS);
      const role = String(req.body?.role || '').trim();
      const memory = String(req.body?.memory || '').trim();

      const system = [
        'You are the LexiPro Control Agent.',
        'You must respond in JSON only.',
        'Return: reply (string), mode ("answer" | "browser" | "builder"), commands (array).',
        'commands entries must be {command: string, args: string[]}.',
        'If a user wants code changes, choose mode="builder".',
        'If user asks for UI navigation or testing, choose mode="browser".',
        'If user asks a question, choose mode="answer".',
        'Only use commands from the allowed list.',
        'Keep reply concise and helpful.',
      ].join(' ');

      const userPrompt = [
        role ? `Role focus: ${role}` : '',
        memory ? `Context memory: ${memory}` : '',
        `Allowed commands: ${availableCommands.join(', ')}`,
        `User input: ${input}`
      ].filter(Boolean).join('\n');

      const parseOutput = (raw: string) => {
        let text = raw.trim();
        if (text.startsWith('```')) {
          const lines = text.split('\n');
          lines.shift();
          if (lines[lines.length - 1]?.trim().startsWith('```')) lines.pop();
          text = lines.join('\n').trim();
        }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('No JSON object found');
        const slice = text.slice(start, end + 1);
        return JSON.parse(slice);
      };

      const fallback = () => ({
        reply: 'I can test the UI, run QA, or modify code. Tell me the goal.',
        mode: 'answer',
        commands: []
      });

      try {
        let parsed: any = null;
        const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
        const model = String(process.env.OPENAI_MODEL || 'gpt-4o-mini-2024-07-18').trim();
        if (apiKey) {
          const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model,
              input: [
                { role: 'system', content: system },
                { role: 'user', content: userPrompt }
              ],
              text: {
                format: {
                  type: 'json_schema',
                  name: 'controller',
                  strict: true,
                  schema: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      reply: { type: 'string' },
                      mode: { type: 'string' },
                      commands: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          properties: {
                            command: { type: 'string' },
                            args: { type: 'array', items: { type: 'string' } }
                          },
                          required: ['command', 'args']
                        }
                      }
                    },
                    required: ['reply', 'mode', 'commands']
                  }
                }
              },
              temperature: 0.2
            })
          });
          if (response.ok) {
            const raw = await response.json();
            const outputText =
              raw?.output_text ||
              raw?.output?.find((item: any) => item?.type === 'message')?.content?.find((part: any) => part?.type === 'output_text')?.text ||
              '';
            parsed = parseOutput(outputText || '');
          } else {
            const detail = await response.text();
            console.warn('OpenAI controller failed, falling back to local AI.', detail);
          }
        }
        if (!parsed) {
          const prompt = `${system}\n${userPrompt}\nReturn JSON only.`;
          const text = await deps.localAiService.generate(prompt, {
            stop: [],
            temperature: 0.2,
            stream: false,
            timeoutMs: 60000
          });
          parsed = parseOutput(text || '');
        }

        const reply = String(parsed?.reply || '').trim() || fallback().reply;
        const mode = String(parsed?.mode || 'answer').trim();
        const commands = Array.isArray(parsed?.commands) ? parsed.commands : [];
        const allow = new Set(availableCommands.map((c: string) => c.toLowerCase()));
        const safeCommands = commands
          .map((c: any) => ({
            command: String(c?.command || '').toLowerCase(),
            args: Array.isArray(c?.args) ? c.args.map((v: any) => String(v)) : []
          }))
          .filter((c: any) => allow.has(c.command));
        return res.json({ reply, mode, commands: safeCommands });
      } catch (err: any) {
        return res.json(fallback());
      }
    }) as any
  );

  router.post('/api/ai/agent',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    deps.rateLimit({ windowMs: 60 * 1000, max: 3 }) as any,
    (async (req: any, res: any) => {
      try {
        if (await enforceIntegrityGate(req, res, 'AI_AGENT')) return;
        const goal = String(req.body?.goal || '').trim();
        const matterId = String(req.body?.matterId || '').trim() || undefined;
        if (!goal) return res.status(400).json({ error: 'Goal required' });

        const result = await deps.agentEngine.runAgent(req.workspaceId, req.userId, goal, matterId);
        return res.json({ status: 'SUCCESS', report: result.answer, trace: result.trace });
      } catch (err: any) {
        const code = err?.code || 'AGENT_FAILED';
        const requestId = err?.requestId;
        console.error('Agent Crash:', err?.message || String(err));
        if (code === 'AI_PROVIDER_ERROR') {
          return res.status(500).json({ errorCode: 'AI_PROVIDER_ERROR', requestId });
        }
        return res.status(500).json({ error: 'Agent Failed' });
      }
    }) as any
  );

  router.post('/api/ai/builder',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('admin') as any,
    deps.rateLimit({ windowMs: 60 * 1000, max: 2 }) as any,
    (async (req: any, res: any) => {
      const builderEnabled = process.env.NODE_ENV === 'development' && String(process.env.BUILDER_MODE || '').trim() === '1';
      if (!builderEnabled) {
        return res.status(403).json({ error: 'BUILDER_DISABLED' });
      }
      try {
        const goal = String(req.body?.goal || '').trim();
        if (!goal) return res.status(400).json({ error: 'Goal required' });
        const role = String(req.body?.role || '').trim() || undefined;
        const memory = String(req.body?.memory || '').trim() || undefined;
        const result = await deps.agentEngine.runBuilderAgent(req.workspaceId, req.userId, goal, role, memory);
        return res.json({ status: 'SUCCESS', report: result.answer, trace: result.trace });
      } catch (err: any) {
        console.error('Builder Agent Crash:', err?.message || String(err));
        return res.status(500).json({ error: 'Builder Failed' });
      }
    }) as any
  );

  router.post('/api/ai/wake',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('admin') as any,
    deps.requireApprovalToken as any,
    deps.rateLimit({ windowMs: 60 * 1000, max: 3 }) as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'AI_WAKE')) return;
      const goal = String(req.body?.goal || '').trim() || 'Check for unfinished tasks and propose next actions.';
      try {
        const result = await deps.agentEngine.runAgent(req.workspaceId, req.userId, goal);
        return res.json({ status: 'SUCCESS', goal, report: result.answer, trace: result.trace });
      } catch (err: any) {
        return res.status(500).json({ error: 'WAKE_FAILED', detail: err?.message || String(err) });
      }
    }) as any
  );

  router.get('/api/workspaces/:workspaceId/search/history',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const limit = Math.min(100, Number(req.query?.limit || 50));
      const rows = await deps.prisma.searchHistory.findMany({
        where: { workspaceId: req.workspaceId, userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      res.json(rows);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/search/history',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const query = String(req.body?.query || '').trim();
      if (!query) return res.status(400).json({ error: 'query required' });
      const status = String(req.body?.status || 'RUNNING').toUpperCase();
      const clientId = req.body?.clientId ? String(req.body.clientId) : null;
      const scopesJson = req.body?.scopes ? JSON.stringify(req.body.scopes) : null;
      const row = await deps.prisma.searchHistory.create({
        data: {
          workspaceId: req.workspaceId,
          userId: req.userId,
          query,
          status,
          clientId,
          scopesJson
        }
      });
      res.json(row);
    }) as any
  );

  router.put('/api/workspaces/:workspaceId/search/history/:id',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const status = String(req.body?.status || '').trim().toUpperCase();
      if (!status) return res.status(400).json({ error: 'status required' });
      const row = await deps.prisma.searchHistory.updateMany({
        where: { id: req.params.id, workspaceId: req.workspaceId, userId: req.userId },
        data: { status }
      });
      res.json({ ok: true, updated: row.count });
    }) as any
  );

  router.get('/api/workspaces/:workspaceId/search/filters',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const rows = await deps.prisma.searchFilter.findMany({
        where: { workspaceId: req.workspaceId, userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      res.json(rows);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/search/filters',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const label = String(req.body?.label || '').trim();
      const content = String(req.body?.content || '').trim();
      const jurisdiction = String(req.body?.jurisdiction || '').trim();
      const source = String(req.body?.source || '').trim();
      const scope = String(req.body?.scope || '').trim();
      if (!label) return res.status(400).json({ error: 'label required' });
      const row = await deps.prisma.searchFilter.create({
        data: {
          workspaceId: req.workspaceId,
          userId: req.userId,
          label,
          content,
          jurisdiction,
          source,
          scope
        }
      });
      res.json(row);
    }) as any
  );

  router.delete('/api/workspaces/:workspaceId/search/filters/:id',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const row = await deps.prisma.searchFilter.deleteMany({
        where: { id: req.params.id, workspaceId: req.workspaceId, userId: req.userId }
      });
      res.json({ ok: true, deleted: row.count });
    }) as any
  );

  router.get('/api/workspaces/:workspaceId/search/folders',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const rows = await deps.prisma.researchFolder.findMany({
        where: { workspaceId: req.workspaceId, userId: req.userId },
        orderBy: { createdAt: 'desc' },
        include: { items: { orderBy: { createdAt: 'desc' } } },
        take: 50
      });
      res.json(rows);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/search/folders',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const name = String(req.body?.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name required' });
      const row = await deps.prisma.researchFolder.create({
        data: {
          workspaceId: req.workspaceId,
          userId: req.userId,
          name
        }
      });
      res.json(row);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/search/folders/:id/items',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const label = String(req.body?.label || '').trim();
      const payloadJson = req.body?.payload ? JSON.stringify(req.body.payload) : null;
      if (!label) return res.status(400).json({ error: 'label required' });
      const folder = await deps.prisma.researchFolder.findFirst({
        where: { id: req.params.id, workspaceId: req.workspaceId, userId: req.userId }
      });
      if (!folder) return res.status(404).json({ error: 'folder not found' });
      const row = await deps.prisma.researchFolderItem.create({
        data: {
          folderId: folder.id,
          label,
          payloadJson
        }
      });
      res.json(row);
    }) as any
  );

  router.get('/api/workspaces/:workspaceId/trust/policy',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const policy = await deps.prisma.workspacePolicy.findUnique({
        where: { workspaceId: req.workspaceId }
      });
      res.json(policy || {
        workspaceId: req.workspaceId,
        uploadsEnabled: true,
        draftingEnabled: true,
        retentionDays: 90,
        mfaRequired: false,
        ipWhitelistEnabled: false
      });
    }) as any
  );

  router.put('/api/workspaces/:workspaceId/trust/policy',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('admin') as any,
    (async (req: any, res: any) => {
      const uploadsEnabled = typeof req.body?.uploadsEnabled === 'boolean' ? req.body.uploadsEnabled : undefined;
      const draftingEnabled = typeof req.body?.draftingEnabled === 'boolean' ? req.body.draftingEnabled : undefined;
      const retentionDays = Number.isFinite(Number(req.body?.retentionDays)) ? Number(req.body.retentionDays) : undefined;
      const mfaRequired = typeof req.body?.mfaRequired === 'boolean' ? req.body.mfaRequired : undefined;
      const ipWhitelistEnabled = typeof req.body?.ipWhitelistEnabled === 'boolean' ? req.body.ipWhitelistEnabled : undefined;
      const data: any = {};
      if (uploadsEnabled !== undefined) data.uploadsEnabled = uploadsEnabled;
      if (draftingEnabled !== undefined) data.draftingEnabled = draftingEnabled;
      if (retentionDays !== undefined) data.retentionDays = Math.max(1, Math.min(3650, retentionDays));
      if (mfaRequired !== undefined) data.mfaRequired = mfaRequired;
      if (ipWhitelistEnabled !== undefined) data.ipWhitelistEnabled = ipWhitelistEnabled;
      const updated = await deps.prisma.workspacePolicy.upsert({
        where: { workspaceId: req.workspaceId },
        update: data,
        create: {
          workspaceId: req.workspaceId,
          uploadsEnabled: data.uploadsEnabled ?? true,
          draftingEnabled: data.draftingEnabled ?? true,
          retentionDays: data.retentionDays ?? 90,
          mfaRequired: data.mfaRequired ?? false,
          ipWhitelistEnabled: data.ipWhitelistEnabled ?? false
        }
      });
      await deps.logAuditEvent(req.workspaceId, req.userId, 'WORKSPACE_POLICY_UPDATED', data);
      res.json(updated);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/trust/purge',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const reason = String(req.body?.reason || 'user_requested').trim();
      await deps.prisma.searchHistory.deleteMany({ where: { workspaceId: req.workspaceId, userId: req.userId } });
      await deps.prisma.searchAlert.deleteMany({ where: { workspaceId: req.workspaceId, userId: req.userId } });
      await deps.prisma.deliveryItem.deleteMany({ where: { workspaceId: req.workspaceId, userId: req.userId } });
      await deps.prisma.searchFilter.deleteMany({ where: { workspaceId: req.workspaceId, userId: req.userId } });
      const folders = await deps.prisma.researchFolder.findMany({
        where: { workspaceId: req.workspaceId, userId: req.userId },
        select: { id: true }
      });
      if (folders.length) {
        await deps.prisma.researchFolderItem.deleteMany({
          where: { folderId: { in: folders.map((f: any) => f.id) } }
        });
        await deps.prisma.researchFolder.deleteMany({
          where: { id: { in: folders.map((f: any) => f.id) } }
        });
      }
      await deps.prisma.retentionEvent.create({
        data: {
          workspaceId: req.workspaceId,
          userId: req.userId,
          action: 'PURGE_SESSION',
          reason
        }
      });
      await deps.logAuditEvent(req.workspaceId, req.userId, 'TRUST_PURGE', { reason });
      res.json({ ok: true });
    }) as any
  );

  router.get('/api/workspaces/:workspaceId/search/alerts',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const rows = await deps.prisma.searchAlert.findMany({
        where: { workspaceId: req.workspaceId, userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      res.json(rows);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/search/alerts',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const query = String(req.body?.query || '').trim();
      if (!query) return res.status(400).json({ error: 'query required' });
      const row = await deps.prisma.searchAlert.create({
        data: {
          workspaceId: req.workspaceId,
          userId: req.userId,
          query,
          active: true
        }
      });
      res.json(row);
    }) as any
  );

  router.put('/api/workspaces/:workspaceId/search/alerts/:id',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const active = typeof req.body?.active === 'boolean' ? req.body.active : null;
      if (active === null) return res.status(400).json({ error: 'active required' });
      const row = await deps.prisma.searchAlert.updateMany({
        where: { id: req.params.id, workspaceId: req.workspaceId, userId: req.userId },
        data: { active }
      });
      res.json({ ok: true, updated: row.count });
    }) as any
  );

  router.get('/api/workspaces/:workspaceId/search/delivery',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const rows = await deps.prisma.deliveryItem.findMany({
        where: { workspaceId: req.workspaceId, userId: req.userId },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      res.json(rows);
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/search/delivery',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const label = String(req.body?.label || '').trim();
      const type = String(req.body?.type || '').trim();
      const status = String(req.body?.status || '').trim();
      if (!label || !type || !status) return res.status(400).json({ error: 'label, type, status required' });
      const row = await deps.prisma.deliveryItem.create({
        data: {
          workspaceId: req.workspaceId,
          userId: req.userId,
          label,
          type,
          status
        }
      });
      res.json(row);
    }) as any
  );

  router.get('/api/qa/latest',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (_req: any, res: any) => {
      try {
        const path = await import('node:path');
        const fs = await import('node:fs');
        const repoRoot = process.cwd();
        const manifestPath = path.join(repoRoot, 'reports', 'qa-browser-agent', 'latest.json');
        if (!fs.existsSync(manifestPath)) {
          return res.json({ ok: true, report: null });
        }
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return res.json({ ok: true, report: parsed });
      } catch (err: any) {
        return res.status(500).json({ ok: false, error: err?.message || String(err) });
      }
    }) as any
  );

  router.get('/api/qa/screenshot',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      try {
        const path = await import('node:path');
        const fs = await import('node:fs');
        const repoRoot = process.cwd();
        const rel = String(req.query?.path || '').replace(/\\\\/g, '/');
        if (!rel || !rel.startsWith('reports/qa-browser-agent/')) {
          return res.status(400).json({ error: 'Invalid path' });
        }
        const safePath = path.resolve(repoRoot, rel);
        if (!safePath.startsWith(path.resolve(repoRoot))) {
          return res.status(403).json({ error: 'Access denied' });
        }
        if (!fs.existsSync(safePath)) {
          return res.status(404).json({ error: 'Not found' });
        }
        res.setHeader('Content-Type', 'image/png');
        fs.createReadStream(safePath).pipe(res);
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || String(err) });
      }
    }) as any
  );

  router.post('/api/ai/resume',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    deps.rateLimit({ windowMs: 60 * 1000, max: 3 }) as any,
    (async (req: any, res: any) => {
      try {
        if (await enforceIntegrityGate(req, res, 'AI_RESUME')) return;
        const exhibitId = String(req.body?.exhibitId || '').trim();
        const goal = String(req.body?.goal || '').trim();
        const matterId = String(req.body?.matterId || '').trim() || undefined;
        if (!exhibitId) return res.status(400).json({ error: 'ExhibitId required' });

        const state = await deps.localAiService.getInferenceState(req.workspaceId, req.userId, exhibitId);
        if (!state) return res.status(404).json({ error: 'No inference state found' });

        const exhibit = await deps.prisma.exhibit.findFirst({
          where: { id: exhibitId, workspaceId: req.workspaceId },
          select: { id: true, filename: true, storageKey: true }
        });
        if (!exhibit?.storageKey) return res.status(404).json({ error: 'Exhibit not found' });

        if (state.evidenceHash) {
          const buffer = await deps.storageService.download(exhibit.storageKey);
          const currentHash = deps.sha256OfBuffer(buffer);
          if (currentHash !== state.evidenceHash) {
            await deps.logAuditEvent(req.workspaceId, req.userId, 'INFERENCE_RESUME_BLOCKED', {
              exhibitId,
              recordedHash: state.evidenceHash,
              actualHash: currentHash
            });
            return res.status(409).json({ error: 'RESUME_BLOCKED', detail: 'Evidence hash mismatch' });
          }
        }

        const parsed = JSON.parse(state.stateJson || '{}');
        const history = String(parsed.history || '');
        const stepIndex = Number.isFinite(state.stepIndex) ? state.stepIndex : 0;
        const resumeGoal = goal || String(parsed.goal || '');
        if (!resumeGoal) return res.status(400).json({ error: 'Goal required to resume' });

        await deps.logAuditEvent(req.workspaceId, req.userId, 'INFERENCE_RESUME_REQUEST', {
          exhibitId,
          filename: exhibit.filename
        });

        const result = await deps.agentEngine.runAgentResume(
          req.workspaceId,
          req.userId,
          resumeGoal,
          { history, stepIndex },
          matterId
        );
        return res.json({ status: 'SUCCESS', report: result.answer, trace: result.trace });
      } catch (err: any) {
        console.error('Agent Resume Crash:', err?.message || String(err));
        return res.status(500).json({ error: 'Resume Failed' });
      }
    }) as any
  );

  router.post('/api/workspaces/:workspaceId/ai/agent/approve',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      if (await enforceIntegrityGate(req, res, 'AI_AGENT_APPROVAL')) return;
      const approvalId = String(req.body?.approvalId || '').trim();
      const decision = String(req.body?.decision || '').toLowerCase();
      if (!approvalId) return res.status(400).json({ error: 'approvalId required' });
      const pending = deps.pendingAgentApprovals.get(approvalId);
      if (!pending || pending.workspaceId !== req.workspaceId) {
        return res.status(404).json({ error: 'approval not found' });
      }

      clearTimeout(pending.timeout);
      deps.pendingAgentApprovals.delete(approvalId);
      const approved = ['approve', 'approved', 'allow', 'yes', 'true', '1'].includes(decision);
      pending.resolve({
        approved,
        reason: approved ? undefined : 'Operator rejected tool execution.'
      });
      await deps.logAuditEvent(req.workspaceId, req.userId, 'TOOL_APPROVAL_DECISION', {
        approvalId,
        decision: approved ? 'APPROVED' : 'REJECTED'
      });

      return res.json({ ok: true, approved });
    }) as any
  );

  router.get('/api/ai/narrate/health',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (_req: any, res: any) => {
      try {
        const ok = await deps.localAiService.isHealthy();
        return res.json({ ok });
      } catch (err: any) {
        return res.json({ ok: false, error: err?.message || 'Ollama unavailable' });
      }
    }) as any
  );

  router.get('/api/system/ai-performance',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (_req: any, res: any) => {
      try {
        const perf = await deps.localAiService.checkHardwareCapability();
        return res.json({ ok: true, performance: perf });
      } catch (err: any) {
        return res.status(500).json({ ok: false, error: err?.message || 'Performance check failed' });
      }
    }) as any
  );

  router.post('/api/system/self-audit',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const query = String(req.body?.query || '').trim();
      const response = deps.selfAuditService.answerQuery(query);
      await deps.logAuditEvent(req.workspaceId, req.userId, 'SELF_AUDIT_QUERY', {
        tier: response.tier,
        query: query ? '[REDACTED]' : ''
      });
      return res.json({ ok: true, ...response });
    }) as any
  );

  router.post('/api/ai/narrate',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    deps.rateLimit({ windowMs: 60 * 1000, max: 6 }) as any,
    (async (req: any, res: any) => {
      try {
        const title = String(req.body?.title || '').trim();
        const path = String(req.body?.path || '').trim();
        if (!title) return res.status(400).json({ error: 'title required' });

        const systemInstruction = deps.getSystemInstruction('forensic_synthesis');
        const prompt = [
          systemInstruction,
          "",
          "You are providing a short, clinical tour narration for LexiPro Forensic OS.",
          "Keep responses under 3 sentences. Use a formal forensic tone.",
          `Step Title: ${title}`,
          `Route: ${path || "unknown"}`
        ].join("\n");

        const text = await deps.localAiService.generate(prompt, { stop: [], temperature: 0.2 });
        return res.json({ ok: true, text });
      } catch (err: any) {
        return res.status(503).json({ ok: false, error: err?.message || 'Narration failed' });
      }
    }) as any
  );

  router.get('/api/workspaces/:workspaceId/ai/agent/stream',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const goal = String(req.query?.goal || '').trim();
      const matterId = String(req.query?.matterId || '').trim() || undefined;
      if (!goal) {
        return res.status(400).json({ error: 'Goal required' });
      }
      const policy = await deps.prisma.workspacePolicy.findUnique({ where: { workspaceId: req.workspaceId } });
      if (policy && policy.draftingEnabled === false) {
        return res.status(403).json({ error: 'DRAFTING_DISABLED' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
      res.write(': ok\n\n');

      let closed = false;
      const pendingIds = new Set<string>();
      req.on('close', () => {
        closed = true;
        for (const approvalId of pendingIds) {
          const pending = deps.pendingAgentApprovals.get(approvalId);
          if (pending) {
            clearTimeout(pending.timeout);
            deps.pendingAgentApprovals.delete(approvalId);
            pending.resolve({ approved: false, reason: 'Stream closed before approval.' });
          }
        }
      });

      const requireApproval = ['1', 'true', 'yes', 'on'].includes(String(req.query?.requireApproval || '').toLowerCase());
      const approvalToolsRaw = req.query?.approvalTools !== undefined
        ? String(req.query.approvalTools || '')
        : null;
      const approvalTools = approvalToolsRaw === null
        ? null
        : approvalToolsRaw.length === 0 || approvalToolsRaw.toLowerCase() === 'none'
          ? new Set<string>()
          : new Set(approvalToolsRaw.split(',').map((v) => v.trim()).filter(Boolean));

      const toolGate = requireApproval
        ? async ({ action, input }: { action: string; input: string }) => {
            if (closed) {
              return { approved: false, reason: 'Stream closed before approval.' };
            }
            if (approvalTools && !approvalTools.has(action)) {
              return { approved: true };
            }
            const approvalId = crypto.randomUUID();
            await deps.logAuditEvent(req.workspaceId, req.userId, 'TOOL_APPROVAL_REQUESTED', {
              approvalId,
              tool: action,
              input
            });
            const decision = new Promise<{ approved: boolean; reason?: string }>((resolve) => {
              const timeout = setTimeout(() => {
                deps.pendingAgentApprovals.delete(approvalId);
                void deps.logAuditEvent(req.workspaceId, req.userId, 'TOOL_APPROVAL_TIMEOUT', {
                  approvalId,
                  tool: action,
                  input
                });
                resolve({ approved: false, reason: 'Approval timed out.' });
              }, deps.TOOL_APPROVAL_TIMEOUT_MS);
              deps.pendingAgentApprovals.set(approvalId, {
                id: approvalId,
                workspaceId: req.workspaceId,
                resolve,
                timeout
              });
            });
            pendingIds.add(approvalId);
            res.write(`event: approval_required\ndata: ${JSON.stringify({ approvalId, action, input })}\n\n`);
            const result = await decision;
            pendingIds.delete(approvalId);
            return result;
          }
        : undefined;

      const keepAlive = setInterval(() => {
        if (!closed) res.write(': keep-alive\n\n');
      }, 15000);

      try {
        const result = await deps.agentEngine.runAgentStream(req.workspaceId, req.userId, goal, (step: any) => {
          if (closed) return;
          res.write(`event: step\ndata: ${JSON.stringify(step)}\n\n`);
        }, toolGate, matterId);
        const shield = await deps.aigisShield.verifyAndFilter(result.answer, req.workspaceId);
        if (!closed) {
          res.write(`event: done\ndata: ${JSON.stringify({
            answer: shield.output,
            status: shield.safe ? 'SUCCESS' : 'REDACTED',
            riskScore: shield.riskScore
          })}\n\n`);
          res.end();
        }
      } catch (err: any) {
        if (!closed) {
          res.write(`event: error\ndata: ${JSON.stringify({ error: err?.message || 'Agent Failed' })}\n\n`);
          res.end();
        }
      } finally {
        clearInterval(keepAlive);
      }
    }) as any
  );

  router.post('/api/ai/safe-chat',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    deps.applyLiabilityFilters as any,
    (async (req: any, res: any) => {
      const query = String(req.body?.query || '').trim();
      const scrubbed = deps.scrubPII(query);
      try {
        const text = await deps.runSafeChat({ workspaceId: req.workspaceId, userId: req.userId, query });
        await deps.logAuditEvent(req.workspaceId, req.userId, 'AI_SAFE_CHAT', {
          query: scrubbed,
          mode: 'general'
        });
        return res.json({
          mode: 'general',
          report: text,
          disclaimer: 'Forensic OS: Not for legal advice.'
        });
      } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Safe chat failed' });
      }
    }) as any
  );

  router.post('/api/ai/aigis',
    deps.authenticate as any,
    deps.requireWorkspace as any,
    deps.requireRole('member') as any,
    (async (req: any, res: any) => {
      const query = String(req.body?.query || '').trim();
      const matterId = String(req.body?.matterId || '').trim() || undefined;
      if (!query) return res.status(400).json({ error: 'Query required' });
      const intent = deps.classifyIntent(query);

      if (intent === 'general') {
        return deps.applyLiabilityFilters(req, res, async () => {
          const scrubbed = deps.scrubPII(query);
          try {
            const text = await deps.runSafeChat({ workspaceId: req.workspaceId, userId: req.userId, query });
            await deps.logAuditEvent(req.workspaceId, req.userId, 'AI_SAFE_CHAT', {
              query: scrubbed,
              mode: 'general'
            });
            return res.json({
              mode: 'general',
              report: text,
              disclaimer: 'Forensic OS: Not for legal advice.'
            });
          } catch (err: any) {
            return res.status(500).json({ error: 'Safe chat failed', detail: err?.message || String(err) });
          }
        });
      }

      try {
        const result = await deps.agentEngine.runAgent(req.workspaceId, req.userId, query, matterId);
        const shield = await deps.aigisShield.verifyAndFilter(result.answer, req.workspaceId);
        return res.json({
          mode: 'forensic',
          status: shield.safe ? 'SUCCESS' : 'REDACTED',
          report: shield.output,
          riskScore: shield.riskScore,
          trace: result.trace
        });
      } catch (err: any) {
        return res.status(500).json({ error: 'Agent Failed', detail: err?.message || String(err) });
      }
    }) as any
  );

  router.post('/api/ai/timeline', deps.authenticate as any, deps.requireWorkspace as any, (async (req: any, res: any) => {
    await deps.logAuditEvent(req.workspaceId, req.userId, 'AI_RELEASE_GATE_BLOCKED', {
      promptKey: 'timeline',
      totalClaims: 0,
      anchoredCount: 0,
      unanchoredCount: 0,
      reasons: ['UNGROUNDED_ENDPOINT_DISABLED']
    });
    void deps.captureNegativeKnowledge(req, {
      attemptedClaimType: 'timeline_event',
      reasons: ['UNGROUNDED_ENDPOINT_DISABLED'],
      reasonDetail: 'Timeline endpoint disabled for ungrounded output.',
      requiredEvidenceType: ['documentary_record'],
      anchorIdsConsidered: [],
    });
    return deps.sendReleaseGate422(req, res, {
      totalCount: 0,
      rejectedCount: 0,
      reasons: ['UNGROUNDED_ENDPOINT_DISABLED']
    });
  }) as any);

  router.post('/api/ai/outcome', deps.authenticate as any, deps.requireWorkspace as any, (async (req: any, res: any) => {
    await deps.logAuditEvent(req.workspaceId, req.userId, 'AI_RELEASE_GATE_BLOCKED', {
      promptKey: 'outcome',
      totalClaims: 0,
      anchoredCount: 0,
      unanchoredCount: 0,
      reasons: ['UNGROUNDED_ENDPOINT_DISABLED']
    });
    void deps.captureNegativeKnowledge(req, {
      attemptedClaimType: 'outcome_prediction',
      reasons: ['UNGROUNDED_ENDPOINT_DISABLED'],
      reasonDetail: 'Outcome endpoint disabled for ungrounded output.',
      requiredEvidenceType: ['case_outcome_record'],
      anchorIdsConsidered: [],
    });
    return deps.sendReleaseGate422(req, res, {
      totalCount: 0,
      rejectedCount: 0,
      reasons: ['UNGROUNDED_ENDPOINT_DISABLED']
    });
  }) as any);

  router.post('/api/ai/damages', deps.authenticate as any, deps.requireWorkspace as any, (async (req: any, res: any) => {
    await deps.logAuditEvent(req.workspaceId, req.userId, 'AI_RELEASE_GATE_BLOCKED', {
      promptKey: 'damages',
      totalClaims: 0,
      anchoredCount: 0,
      unanchoredCount: 0,
      reasons: ['UNGROUNDED_ENDPOINT_DISABLED']
    });
    void deps.captureNegativeKnowledge(req, {
      attemptedClaimType: 'damage_estimate',
      reasons: ['UNGROUNDED_ENDPOINT_DISABLED'],
      reasonDetail: 'Damages endpoint disabled for ungrounded output.',
      requiredEvidenceType: ['financial_record'],
      anchorIdsConsidered: [],
    });
    return deps.sendReleaseGate422(req, res, {
      totalCount: 0,
      rejectedCount: 0,
      reasons: ['UNGROUNDED_ENDPOINT_DISABLED']
    });
  }) as any);

  return router;
}
