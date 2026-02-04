import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { prisma } from '../lib/prisma.js';
import { storageService } from '../storageService.js';
import { logAuditEvent } from '../audit.js';
import { generateProofPacket } from '../services/packagingService.js';
import { verifyPacketIntegrity } from '../utils/packetVerifier.js';

let dbAvailable = false;
try {
  await prisma.$queryRaw`SELECT 1`;
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

async function createWorkspace(seed: string) {
  const user = await prisma.user.create({
    data: { email: `packet-${seed}@lexipro.local`, passwordHash: 'hash' }
  });
  const workspace = await prisma.workspace.create({ data: { name: `Packet ${seed}` } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role: 'admin' }
  });
  const matter = await prisma.matter.create({
    data: { workspaceId: workspace.id, slug: `matter-${seed}`, name: `Matter ${seed}` }
  });
  return { user, workspace, matter };
}

function sha256(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

test('proof packet verifies and detects tampering', { skip: !dbAvailable }, async () => {
  process.env.NODE_ENV = 'test';
  process.env.STORAGE_ENCRYPTION_REQUIRED = 'false';
  const seed = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const { user, workspace, matter } = await createWorkspace(seed);

  const evidence = Buffer.from(`evidence-${seed}`);
  const storageKey = `${workspace.id}/evidence-${seed}.txt`;
  await storageService.upload(storageKey, evidence);

  const exhibit = await prisma.exhibit.create({
    data: {
      workspaceId: workspace.id,
      matterId: matter.id,
      filename: `evidence-${seed}.txt`,
      mimeType: 'text/plain',
      storageKey,
      type: 'PDF',
      integrityHash: sha256(evidence)
    }
  });

  await logAuditEvent(workspace.id, user.id, 'EXHIBIT_UPLOAD', { details: { exhibitId: exhibit.id } });
  await logAuditEvent(workspace.id, user.id, 'PROOF_PACKET_REQUESTED', { details: { matterId: matter.id } });

  const { buffer } = await generateProofPacket(workspace.id, matter.id);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-packet-'));
  const zipPath = path.join(tmpDir, 'packet.zip');
  fs.writeFileSync(zipPath, buffer);

  const verification = verifyPacketIntegrity(zipPath);
  assert.deepEqual(verification, { ok: true });

  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-packet-tamper-'));
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractDir, true);
  const manifest = JSON.parse(fs.readFileSync(path.join(extractDir, 'manifest.json'), 'utf-8'));
  const evidencePath = Object.keys(manifest.files).find((entry) => entry.startsWith('evidence/'));
  assert.ok(evidencePath);
  const fullEvidencePath = path.join(extractDir, evidencePath as string);
  const data = fs.readFileSync(fullEvidencePath);
  data[0] = (data[0] + 1) % 256;
  fs.writeFileSync(fullEvidencePath, data);

  const tamperedZip = new AdmZip();
  tamperedZip.addLocalFolder(extractDir);
  const tamperedPath = path.join(tmpDir, 'packet-tampered.zip');
  tamperedZip.writeZip(tamperedPath);

  const tamperedResult = verifyPacketIntegrity(tamperedPath);
  assert.equal(tamperedResult.ok, false);
});
