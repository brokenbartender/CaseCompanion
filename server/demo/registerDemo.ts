import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type WorkspaceRole = "owner" | "admin" | "member" | "co_counsel" | "client" | "viewer";

type DemoDeps = {
  app: any;
  prisma: any;
  logAuditEvent: any;
  ingestExhibit: (args: any) => Promise<any>;
  safeResolve: (root: string, target: string) => string;
  tempDir: string;
  integrityAlertService: { broadcast: (payload: any) => void };
  requireApprovalToken: (req: any, res: any, next: any) => any;
  requireWorkspace: any;
  requireRole: (role: WorkspaceRole) => any;
  authenticate: any;
};

const parseEnvFlag = (value: string | undefined, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

const isDemoEnabled = () => parseEnvFlag(process.env.DEMO_MODE, false);
const isIsolatedDemo = () => process.env.DEMO_MODE === "true" && process.env.ISOLATED_ENV === "true";

const requireDemoApproval = (deps: DemoDeps) => async (req: any, res: any, next: any) => {
  const approvalRequired = parseEnvFlag(process.env.APPROVAL_REQUIRED, process.env.NODE_ENV === "production");
  const bypass = parseEnvFlag(process.env.DEMO_APPROVAL_BYPASS, false);
  const isDemoPath = String(req.path || "").startsWith("/api/demo/");

  if (!approvalRequired) return next();

  if (isIsolatedDemo() && bypass && isDemoPath) {
    console.warn("SECURITY WARNING: Running in ISOLATED DEMO MODE. Approval bypass enabled.");
    try {
      await deps.logAuditEvent(req.workspaceId, req.userId || "system", "DEMO_APPROVAL_BYPASSED", {
        workspaceId: req.workspaceId,
        userId: req.userId,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    } catch {
      // ignore demo audit failure
    }
    return next();
  }

  if (process.env.DEMO_MODE === "true" && !isIsolatedDemo()) {
    console.error("FATAL: DEMO_MODE enabled in non-isolated environment. Shutting down for safety.");
    process.exit(1);
  }

  return deps.requireApprovalToken(req, res, next);
};

async function seedDemoExhibits(deps: DemoDeps, workspaceId: string, userId: string, paths: string[]) {
  const results: Array<{ exhibit: any; seeded: boolean }> = [];
  const baseTempDir = process.env.NODE_ENV === "test"
    ? path.join(os.tmpdir(), "lexipro-demo")
    : deps.tempDir;
  if (!fs.existsSync(baseTempDir)) {
    fs.mkdirSync(baseTempDir, { recursive: true });
  }
  for (const demoPath of paths) {
    const demoFilename = path.basename(demoPath);
    const existing = await deps.prisma.exhibit.findFirst({
      where: { workspaceId, filename: demoFilename, deletedAt: null },
      orderBy: { createdAt: "desc" }
    });
    if (existing) {
      results.push({ exhibit: existing, seeded: false });
      continue;
    }

    if (!fs.existsSync(demoPath)) {
      throw new Error(`Demo exhibit PDF not found at ${demoPath}`);
    }

    const tempName = `demo-${Date.now()}-${demoFilename}`;
    const tempPath = deps.safeResolve(baseTempDir, tempName);
    await fs.promises.copyFile(demoPath, tempPath);

    const file = {
      path: tempPath,
      originalname: demoFilename,
      mimetype: "application/pdf"
    } as any;

    const exhibit = await deps.ingestExhibit({ workspaceId, userId, file, matterIdOrSlug: "demo-matter" });
    results.push({ exhibit, seeded: true });
  }

  return results;
}

export function registerDemoRoutes(deps: DemoDeps) {
  if (!isDemoEnabled()) return;
  if (process.env.NODE_ENV === "production" && !parseEnvFlag(process.env.ALLOW_DEMO_IN_PROD, false)) {
    throw new Error("DEMO_MODE is enabled in production without ALLOW_DEMO_IN_PROD=1.");
  }

  const demoSeedFlagRaw = String(process.env.DEMO_SEED_ENABLED || "").trim().toLowerCase();
  const demoSeedEnabled = isDemoEnabled()
    && (demoSeedFlagRaw ? ["1", "true", "yes"].includes(demoSeedFlagRaw) : true);

  deps.app.post("/api/demo/seed",
    deps.authenticate,
    deps.requireWorkspace,
    requireDemoApproval(deps),
    deps.requireRole("admin"),
    (async (req: any, res: any) => {
      try {
        if (!isDemoEnabled()) {
          return res.status(403).json({ errorCode: "DEMO_MODE_DISABLED", message: "Demo mode is disabled. Set DEMO_MODE=1 to enable." });
        }
        if (!demoSeedEnabled) {
          return res.status(403).json({ errorCode: "DEMO_SEED_DISABLED", message: "Demo seeding is disabled in this environment." });
        }
        if (process.env.NODE_ENV === "production") {
          const prodOk = ["1", "true", "yes"].includes(String(process.env.DEMO_SEED_PROD_OK || "").toLowerCase());
          if (!prodOk) {
            return res.status(403).json({ errorCode: "DEMO_SEED_PROD_LOCKED", message: "Demo seeding is locked in production." });
          }
        }

        const demoPathsEnv = String(process.env.DEMO_EXHIBIT_PATHS || "").trim();
        const demoPaths = demoPathsEnv
          ? demoPathsEnv.split(",").map((item) => item.trim()).filter(Boolean)
          : [
              path.resolve(process.cwd(), "docs", "demo_set", "Anchor_Agreement.pdf"),
              path.resolve(process.cwd(), "docs", "demo_set", "Email_Thread.pdf"),
              path.resolve(process.cwd(), "docs", "demo_set", "Financial_Statement.pdf"),
              path.resolve(process.cwd(), "docs", "demo_set", "Contradictory_Memo.pdf")
            ];

        const results = await seedDemoExhibits(deps, req.workspaceId, req.userId, demoPaths);
        for (const entry of results) {
          await deps.logAuditEvent(req.workspaceId, req.userId, "DEMO_SEED_RUN", {
            exhibitId: entry.exhibit.id,
            filename: entry.exhibit.filename,
            seeded: entry.seeded
          });
        }

        res.json({
          ok: true,
          seeded: results.some((entry) => entry.seeded),
          seededCount: results.filter((entry) => entry.seeded).length,
          exhibits: results.map((entry) => ({
            exhibitId: entry.exhibit.id,
            filename: entry.exhibit.filename,
            seeded: entry.seeded
          })),
          exhibit: results[0]?.exhibit
        });
      } catch (err: any) {
        res.status(500).json({ error: "DEMO_SEED_FAILED", detail: err?.message || String(err) });
      }
    }) as any
  );

  deps.app.post("/api/demo/sabotage",
    deps.authenticate,
    deps.requireWorkspace,
    requireDemoApproval(deps),
    deps.requireRole("admin"),
    (async (req: any, res: any) => {
      try {
        if (!isDemoEnabled()) {
          return res.status(403).json({ errorCode: "DEMO_MODE_DISABLED", message: "Demo mode is disabled. Set DEMO_MODE=1 to enable." });
        }
        if (!demoSeedEnabled) {
          return res.status(403).json({ errorCode: "DEMO_SABOTAGE_DISABLED", message: "Demo sabotage is disabled in this environment." });
        }
        if (process.env.NODE_ENV === "production") {
          const prodOk = ["1", "true", "yes"].includes(String(process.env.DEMO_SEED_PROD_OK || "").toLowerCase());
          if (!prodOk) {
            return res.status(403).json({ errorCode: "DEMO_SABOTAGE_PROD_LOCKED", message: "Demo sabotage is locked in production." });
          }
        }

        const exhibit = await deps.prisma.exhibit.findFirst({
          where: { workspaceId: req.workspaceId, deletedAt: null },
          orderBy: { createdAt: "desc" }
        });
        if (!exhibit) return res.status(404).json({ error: "No exhibit available to sabotage." });

        const originalHash = exhibit.integrityHash || "";
        const corruptedHash = originalHash
          ? originalHash.slice(0, -1) + (originalHash.slice(-1) === "a" ? "b" : "a")
          : `corrupted-${Date.now()}`;

        await deps.prisma.exhibit.update({
          where: { id: exhibit.id },
          data: {
            integrityHash: corruptedHash,
            verificationStatus: "REVOKED",
            revokedAt: new Date(),
            revocationReason: "INTEGRITY_SIMULATION_SABOTAGE"
          }
        });

        await deps.logAuditEvent(req.workspaceId, req.userId, "SYSTEM_INTEGRITY_BREACH", {
          exhibitId: exhibit.id,
          filename: exhibit.filename,
          originalHash,
          corruptedHash,
          note: "Deterministic heartbeat desync simulated."
        });

        deps.integrityAlertService.broadcast({
          type: "SYSTEM_INTEGRITY_BREACH",
          exhibitId: exhibit.id,
          filename: exhibit.filename,
          reason: "DETERMINISTIC_HEARTBEAT_DESYNC",
          timestamp: new Date().toISOString(),
          message: `CRITICAL ALERT: DETERMINISTIC_HEARTBEAT_DESYNC detected on Exhibit ${exhibit.id}. Sealing inference gates. Evidence is no longer admissible.`
        });

        res.json({
          ok: true,
          exhibitId: exhibit.id,
          message: "Sabotage triggered. Exhibit revoked and breach broadcast."
        });
      } catch (err: any) {
        res.status(500).json({ error: "DEMO_SABOTAGE_FAILED", detail: err?.message || String(err) });
      }
    }) as any
  );
}
