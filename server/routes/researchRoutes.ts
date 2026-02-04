import express from 'express';
import { searchCaseLaw, validateCitation } from '../services/legalResearchService.js';

export function createResearchRouter(deps?: { authenticate?: any; requireWorkspace?: any; requireRole?: any }) {
  const router = express.Router();
  const auth = deps?.authenticate;
  const workspace = deps?.requireWorkspace;
  const role = deps?.requireRole;

  const guard = [auth, workspace, role ? role('viewer') : null].filter(Boolean) as any[];

  router.post('/search', ...guard, async (req, res) => {
    try {
      const query = String(req.body?.query || '');
      const results = await searchCaseLaw(query);
      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Search failed' });
    }
  });

  router.post('/validate', ...guard, async (req, res) => {
    try {
      const citation = String(req.body?.citation || '');
      const result = await validateCitation(citation);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Validation failed' });
    }
  });

  return router;
}
