import AdmZip from 'adm-zip';
import crypto from 'crypto';
import { AUDIT_GENESIS_HASH, computeAuditEventHash } from '../services/auditHash.js';

type VerificationResult = { ok: true } | { ok: false; reason: string };

function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function computeManifestSelfHash(manifest: any) {
  const files = { ...(manifest?.files || {}) };
  delete files['manifest.json'];
  const basePayload = {
    ...manifest,
    files
  };
  delete (basePayload as any).manifestHashAlgorithm;
  delete (basePayload as any).manifestHashScope;
  const baseJson = JSON.stringify(basePayload, null, 2);
  return sha256(Buffer.from(baseJson));
}

function verifyChain(events: any[]): boolean {
  let prevHash = AUDIT_GENESIS_HASH;

  for (const event of events) {
    const createdAt = event.createdAt instanceof Date
      ? event.createdAt
      : new Date(event.createdAt);
    const action = event.action || event.eventType;
    let details: any = null;
    if (event.detailsJson) {
      try {
        details = JSON.parse(event.detailsJson);
      } catch {
        details = event.detailsJson;
      }
    }
    const expectedHash = computeAuditEventHash({
      prevHash,
      timestamp: createdAt.toISOString(),
      actorId: event.actorId,
      action,
      details
    });
    if (event.prevHash !== prevHash || event.hash !== expectedHash) {
      return false;
    }
    prevHash = event.hash;
  }
  return true;
}

export function verifyPacketIntegrity(zipPath: string): VerificationResult {
  const zip = new AdmZip(zipPath);
  const manifestEntry = zip.getEntry('manifest.json');
  if (!manifestEntry) {
    return { ok: false, reason: 'MANIFEST_MISSING' };
  }
  let manifest: any = null;
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf-8'));
  } catch {
    return { ok: false, reason: 'MANIFEST_INVALID' };
  }
  if (!manifest?.files || typeof manifest.files !== 'object') {
    return { ok: false, reason: 'MANIFEST_FILES_INVALID' };
  }

  for (const [filename, expectedHash] of Object.entries(manifest.files)) {
    if (filename === 'manifest.json') {
      const computed = computeManifestSelfHash(manifest);
      if (computed !== expectedHash) {
        return { ok: false, reason: 'MANIFEST_SELF_HASH_MISMATCH' };
      }
      continue;
    }
    const entry = zip.getEntry(filename);
    if (!entry) {
      return { ok: false, reason: `MISSING_FILE:${filename}` };
    }
    const actualHash = sha256(entry.getData());
    if (actualHash !== expectedHash) {
      return { ok: false, reason: `HASH_MISMATCH:${filename}` };
    }
  }

  const chainEntry = zip.getEntry('chain_of_custody.json');
  if (!chainEntry) {
    return { ok: false, reason: 'CHAIN_OF_CUSTODY_MISSING' };
  }
  let chainEvents: any[] = [];
  try {
    chainEvents = JSON.parse(chainEntry.getData().toString('utf-8'));
  } catch {
    return { ok: false, reason: 'CHAIN_OF_CUSTODY_INVALID' };
  }

  if (!verifyChain(chainEvents)) {
    return { ok: false, reason: 'AUDIT_CHAIN_INVALID' };
  }

  return { ok: true };
}
