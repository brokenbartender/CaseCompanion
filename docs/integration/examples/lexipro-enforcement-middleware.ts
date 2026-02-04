import type { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";

type LexiProResponse = {
  ok?: boolean;
  proof?: { requestId?: string };
  errorCode?: string;
};

export function lexiproEnforcementGate(opts: {
  baseUrl: string;
  workspaceId: string;
  getJwt: (req: Request) => string;
  matterId: string;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const prompt = String(req.body?.prompt || req.body?.userPrompt || "").trim();
    if (!prompt) {
      res.status(400).json({ error: "Missing prompt" });
      return;
    }

    const response = await fetch(`${opts.baseUrl}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.getJwt(req)}`,
        "x-workspace-id": opts.workspaceId
      },
      body: JSON.stringify({
        userPrompt: prompt,
        promptKey: "forensic_synthesis",
        matterId: opts.matterId
      })
    });

    const payload = (await response.json().catch(() => ({}))) as LexiProResponse;
    if (response.status === 422 || payload.ok === false) {
      res.status(422).json({
        ok: false,
        withheld: true,
        reason: payload.errorCode || "WITHHELD"
      });
      return;
    }

    req.body.lexiproProof = payload.proof || null;
    req.body.lexiproPass = true;
    next();
  };
}
