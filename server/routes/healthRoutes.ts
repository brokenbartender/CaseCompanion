import express from 'express';

export function createHealthRouter(deps: {
  authenticate: any;
  requireWorkspace: any;
  requireRole: any;
  readEnv: (name: string) => string;
}) {
  const router = express.Router();

  // Simple capability ping
  router.get('/api/health', (_req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.json({ ok: true });
    }
    res.json({ ok: true, service: 'lexipro-forensic-backend', version: 'phase1' });
  });

  router.get('/health', (_req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.json({ ok: true });
    }
    res.json({ ok: true, service: 'lexipro-forensic-backend', version: 'phase1' });
  });

  // Rich health details behind admin auth.
  router.get('/api/health/details', deps.authenticate as any, deps.requireWorkspace as any, deps.requireRole('admin') as any, (req: any, res: any) => {
    res.json({
      ok: true,
      service: 'lexipro-forensic-backend',
      version: 'phase1',
      workspaceId: req.workspaceId,
      build: {
        gitSha: process.env.GIT_SHA || process.env.COMMIT_SHA || process.env.RENDER_GIT_COMMIT || 'unknown'
      }
    });
  });

  // Env readiness ping (presence only, never values).
  router.get('/api/health/env', (_req, res) => {
    const required = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = required.filter((key) => !deps.readEnv(key));
    const llmKey = deps.readEnv('GEMINI_API_KEY')
      || deps.readEnv('AI_SECRET_MANAGER_GEMINI_KEY')
      || deps.readEnv('OPENAI_API_KEY');
    if (!llmKey) {
      missing.push('LLM_API_KEY');
    }
    if (missing.length) {
      return res.status(500).json({
        status: 'ERROR',
        diagnostics: { env: 'MISSING' },
        missing
      });
    }
    return res.json({ status: 'OK', diagnostics: { env: 'VALIDATED' } });
  });

  return router;
}
