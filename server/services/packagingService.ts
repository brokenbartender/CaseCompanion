import AdmZip from 'adm-zip';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma.js';
import { verifyAuditChain } from './auditService.js';
import { storageService } from '../storageService.js';
import { getPublicKeyFingerprint, getPublicKeyPem, getSigningAlgorithm, signPayload } from '../utils/signing.js';

type IntegrityMode = 'signed' | 'hash-only';
type SignatureStatus = 'signed' | 'unsigned';

type ManifestIntegrity = {
  mode: IntegrityMode;
  signed: boolean;
  reason?: string;
  signatureStatus: SignatureStatus;
  signatureReason?: string | null;
  manifestHash?: string;
  signerKeyId?: string | null;
  algorithm?: string | null;
};

function sanitizeEvent(evt: any) {
  return {
    timestamp: evt.createdAt,
    type: evt.eventType,
    actor: evt.actorId === 'system' ? 'System Authority' : 'Authorized User',
    hash: evt.hash,
    previous_link: evt.prevHash
  };
}

function summarizeAuditChain(events: any[]) {
  const sanitized = events.map(sanitizeEvent);
  const issues: string[] = [];
  let continuityOk = true;

  for (let i = 0; i < events.length; i += 1) {
    const evt = events[i];
    if (!evt.hash) {
      continuityOk = false;
      issues.push(`Missing hash at index ${i}`);
    }
    if (i > 0 && evt.prevHash && events[i - 1]?.hash && evt.prevHash !== events[i - 1].hash) {
      continuityOk = false;
      issues.push(`Hash continuity break at index ${i}`);
    }
  }

  const first = events[0]?.createdAt || null;
  const last = events[events.length - 1]?.createdAt || null;
  return {
    count: events.length,
    continuityOk,
    issues,
    firstTimestamp: first,
    lastTimestamp: last,
    sanitized
  };
}

function safeZipName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function sha256(text: string) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function verifyExhibitBuffer(exhibit: any, buffer: Buffer) {
  const expected = String(exhibit?.integrityHash || '');
  const actual = crypto.createHash('sha256').update(buffer).digest('hex');
  if (!expected || actual !== expected) {
    const err: any = new Error(`Export hash mismatch for exhibit ${exhibit?.id || 'unknown'}`);
    err.code = 'EXPORT_HASH_MISMATCH';
    err.exhibitId = exhibit?.id || null;
    err.expectedHash = expected || null;
    err.actualHash = actual;
    throw err;
  }
}

function normalizeClaimProof(proof: any) {
  const anchorIds = Array.isArray(proof?.anchorIds) ? proof.anchorIds.map(String).sort() : [];
  const spans = Array.isArray(proof?.sourceSpans) ? proof.sourceSpans.map((span: any) => ({
    anchorId: span?.anchorId ?? null,
    exhibitId: span?.exhibitId ?? null,
    pageNumber: span?.pageNumber ?? null,
    lineNumber: span?.lineNumber ?? null,
    bbox: span?.bbox ?? null,
    spanText: span?.spanText ?? null,
    integrityStatus: span?.integrityStatus ?? null,
    integrityHash: span?.integrityHash ?? null
  })) : [];
  spans.sort((a: any, b: any) => {
    const aKey = `${a.anchorId || ''}:${a.exhibitId || ''}:${a.pageNumber ?? ''}:${a.lineNumber ?? ''}`;
    const bKey = `${b.anchorId || ''}:${b.exhibitId || ''}:${b.pageNumber ?? ''}:${b.lineNumber ?? ''}`;
    return aKey.localeCompare(bKey);
  });
  return {
    claimId: proof?.claimId,
    claim: proof?.claim,
    anchorIds,
    sourceSpans: spans,
    verification: proof?.verification
  };
}

function hashClaimProof(proof: any) {
  return sha256(JSON.stringify(normalizeClaimProof(proof)));
}

export async function generateAdmissibilityPackage(
  workspaceId: string,
  exhibitId: string
): Promise<{ buffer: Buffer; metadata: { manifestHash: string; generatedAt: string; exhibitId: string; workspaceId: string } }> {
  const exhibit = await prisma.exhibit.findFirst({
    where: { id: exhibitId, workspaceId }
  });
  if (!exhibit) throw new Error('Exhibit not found');

  const rawEvents = await prisma.auditEvent.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' }
  });

  const exhibitEvents = rawEvents.filter((evt: any) => {
    if (!evt.payloadJson) return false;
    try {
      const payload = JSON.parse(evt.payloadJson);
      return payload?.exhibitId === exhibitId;
    } catch {
      return false;
    }
  });

  const generatedAt = new Date().toISOString();
  const initialIntegrity: ManifestIntegrity = {
    mode: 'hash-only',
    signed: false,
    reason: 'signing key unavailable',
    signatureStatus: 'unsigned',
    signatureReason: 'signing key unavailable',
    manifestHash: ''
  };
  const manifestData: any = {
    exhibitId: exhibit.id,
    workspaceId,
    integrityMode: 'hash-only',
    signatureStatus: 'unsigned',
    signerKeyId: null,
    file: {
      name: exhibit.filename,
      mime: exhibit.mimeType,
      createdAt: exhibit.createdAt,
      integrityHash: exhibit.integrityHash
    },
    evidenceHash: exhibit.integrityHash,
    integrity: initialIntegrity,
    chainOfCustody: exhibitEvents.map(sanitizeEvent),
    auditEventCount: exhibitEvents.length,
    generatedAt,
    systemVersion: 'LexiPro v1.1.2 (Forensic Edition)',
    fileDigests: []
  };

  let signatureBundle = "";
  let publicKeyPem: string | null = null;
  let integrityMode: IntegrityMode = 'hash-only';
  let integrityReason: 'signing key unavailable' | 'invalid key' | null = 'signing key unavailable';
  let manifestJson = "";
  let rootHash = "";
  const timestamp = generatedAt;
  let signerKeyId: string | null = null;
  let signingAlgorithm: string | null = null;
  let canSign = false;

  try {
    signerKeyId = getPublicKeyFingerprint();
    signingAlgorithm = getSigningAlgorithm();
    publicKeyPem = getPublicKeyPem();
    signPayload('signing_probe');
    canSign = true;
  } catch {
    signerKeyId = null;
    signingAlgorithm = null;
    publicKeyPem = null;
    canSign = false;
  }

  integrityMode = canSign ? 'signed' : 'hash-only';
  integrityReason = canSign ? null : (integrityReason || 'signing key unavailable');
  manifestData.integrity = {
    mode: integrityMode,
    signed: integrityMode === 'signed',
    reason: integrityMode === 'signed' ? undefined : (integrityReason || 'signing key unavailable'),
    signatureStatus: integrityMode === 'signed' ? 'signed' : 'unsigned',
    signatureReason: integrityMode === 'signed' ? null : (integrityReason || 'signing key unavailable'),
    manifestHash: '',
    signerKeyId,
    algorithm: signingAlgorithm
  };
  manifestData.integrityMode = manifestData.integrity.mode;
  manifestData.signatureStatus = manifestData.integrity.signatureStatus;
  manifestData.signerKeyId = signerKeyId;
  manifestData.fileDigests = [];
  const zip = new AdmZip();
  const chainOfCustodyBuffer = Buffer.from(manifestJson);
  zip.addFile('chain_of_custody.json', chainOfCustodyBuffer);
  const signatureBuffer = Buffer.from(signatureBundle);
  zip.addFile('manifest.sig', signatureBuffer);
  if (publicKeyPem) {
    const keyBuffer = Buffer.from(publicKeyPem);
    zip.addFile('verification_key.pem', keyBuffer);
    manifestData.fileDigests.push({
      path: 'verification_key.pem',
      sha256: crypto.createHash('sha256').update(keyBuffer).digest('hex')
    });
  } else {
    const noticeBuffer = Buffer.from("# Admissibility Package Notice\n\nSignature generation failed in this environment. The manifest remains intact, but cryptographic verification is unavailable.\n");
    zip.addFile('UNSIGNED_NOTICE.md', noticeBuffer);
    manifestData.fileDigests.push({
      path: 'UNSIGNED_NOTICE.md',
      sha256: crypto.createHash('sha256').update(noticeBuffer).digest('hex')
    });
  }

  const cloudAnchor = {
    rootHash,
    anchoredAt: timestamp,
    storage: 'S3_OBJECT_LOCK',
    simulated: true,
    bucket: 'lexipro-ledger-anchor',
    objectKey: `ledger/${workspaceId}/${exhibitId}/${Date.now()}.json`
  };
  const cloudAnchorBuffer = Buffer.from(JSON.stringify(cloudAnchor, null, 2));
  zip.addFile('cloud_anchor.json', cloudAnchorBuffer);
  manifestData.fileDigests.push({
    path: 'cloud_anchor.json',
    sha256: crypto.createHash('sha256').update(cloudAnchorBuffer).digest('hex')
  });

  const templatePath = process.cwd() + '/server/templates/offline-verifier.html';
  if (fs.existsSync(templatePath)) {
    const html = fs.readFileSync(templatePath);
    zip.addFile('OFFLINE_VERIFIER.html', html);
    manifestData.fileDigests.push({
      path: 'OFFLINE_VERIFIER.html',
      sha256: crypto.createHash('sha256').update(html).digest('hex')
    });
  }

  manifestJson = JSON.stringify(manifestData, null, 2);
  rootHash = crypto.createHash('sha256').update(manifestJson).digest('hex');
  manifestData.integrity.manifestHash = rootHash;
  manifestJson = JSON.stringify(manifestData, null, 2);
  if (canSign) {
    try {
      const signatureB64 = signPayload(manifestJson);
      signatureBundle = JSON.stringify({
        status: 'signed',
        signatureB64,
        algorithm: signingAlgorithm,
        signerKeyId,
        rootHash,
        timestamp
      }, null, 2);
    } catch (err: any) {
      canSign = false;
      integrityMode = 'hash-only';
      integrityReason = 'signing key unavailable';
      manifestData.integrity = {
        mode: integrityMode,
        signed: false,
        reason: integrityReason,
        signatureStatus: 'unsigned',
        signatureReason: integrityReason,
        manifestHash: '',
        signerKeyId,
        algorithm: signingAlgorithm
      };
      manifestData.integrityMode = manifestData.integrity.mode;
      manifestData.signatureStatus = manifestData.integrity.signatureStatus;
      manifestData.signerKeyId = signerKeyId;
      manifestJson = JSON.stringify(manifestData, null, 2);
      rootHash = crypto.createHash('sha256').update(manifestJson).digest('hex');
      manifestData.integrity.manifestHash = rootHash;
      manifestJson = JSON.stringify(manifestData, null, 2);
      signatureBundle = JSON.stringify({
        status: 'unsigned',
        error: err?.message || String(err),
        rootHash,
        generatedAt
      }, null, 2);
    }
  } else {
    signatureBundle = JSON.stringify({
      status: 'unsigned',
      reason: integrityReason || 'signing key unavailable',
      rootHash,
      generatedAt
    }, null, 2);
  }

  const finalManifestBuffer = Buffer.from(manifestJson);
  zip.updateFile('chain_of_custody.json', finalManifestBuffer);
  zip.updateFile('manifest.sig', Buffer.from(signatureBundle));

  return {
    buffer: zip.toBuffer(),
    metadata: {
      manifestHash: rootHash,
      generatedAt,
      exhibitId: exhibit.id,
      workspaceId
    }
  };
}

export async function generateProofPacket(
  workspaceId: string,
  matterId: string
): Promise<{ buffer: Buffer; metadata: { generatedAt: string; workspaceId: string; matterId: string } }> {
  const matter = await prisma.matter.findFirst({
    where: { id: matterId, workspaceId }
  });
  if (!matter) throw new Error('Matter not found');

  const exhibits = await prisma.exhibit.findMany({
    where: { workspaceId, matterId, deletedAt: null }
  });

  const hashes: Record<string, string> = {};
  for (const exhibit of exhibits) {
    if (exhibit.integrityHash) {
      hashes[exhibit.id] = exhibit.integrityHash;
    }
  }

  const auditChain = await prisma.auditEvent.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' }
  });
  const auditSummary = summarizeAuditChain(auditChain);
  const chainVerification = await verifyAuditChain(workspaceId);
  const ledgerProof = await prisma.auditLedgerProof.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' }
  });

  const derivedEvents = await prisma.auditEvent.findMany({
    where: { workspaceId, eventType: 'DERIVED_ARTIFACT' },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  const derivedArtifacts = derivedEvents.map((event: any) => {
    try {
      return JSON.parse(event.payloadJson || '{}');
    } catch {
      return {};
    }
  });
  const exhibitIdSet = new Set(exhibits.map((ex: any) => ex.id));
  const claimProofArtifacts = derivedArtifacts.filter((artifact: any) => {
    const exhibitIds = Array.isArray(artifact?.exhibitIdsUsed) ? artifact.exhibitIdsUsed : [];
    const matchesMatter = exhibitIds.some((id: string) => exhibitIdSet.has(id));
    return matchesMatter && Array.isArray(artifact?.claimProofs) && artifact.claimProofs.length > 0;
  }).map((artifact: any) => {
    const claimProofs = Array.isArray(artifact.claimProofs) ? artifact.claimProofs : [];
    const claimProofHashes = Array.isArray(artifact.claimProofHashes)
      ? artifact.claimProofHashes
      : claimProofs.map((proof: any) => ({
          claimId: proof?.claimId,
          hash: hashClaimProof(proof),
          verification: proof?.verification
        }));
    const claimProofsHash = artifact.claimProofsHash
      || (claimProofHashes.length ? sha256(JSON.stringify(claimProofHashes.map((entry: any) => entry.hash).sort())) : null);
    return {
      requestId: artifact.requestId || null,
      artifactType: artifact.artifactType || 'unknown',
      createdAt: artifact.createdAt || null,
      claimProofsHash,
      claimProofHashes,
      claimProofs
    };
  });
  const proofContracts = derivedArtifacts.filter((artifact: any) => {
    const exhibitIds = Array.isArray(artifact?.exhibitIdsUsed) ? artifact.exhibitIdsUsed : [];
    const matchesMatter = exhibitIds.some((id: string) => exhibitIdSet.has(id));
    return matchesMatter && artifact?.proofContract;
  }).map((artifact: any) => ({
    requestId: artifact.requestId || null,
    artifactType: artifact.artifactType || 'unknown',
    createdAt: artifact.createdAt || null,
    proofContractHash: artifact.proofContractHash || null,
    replayHash: artifact.replayHash || null,
    proofContract: artifact.proofContract
  }));
  const transcriptSegments = await prisma.transcriptSegment.findMany({
    where: { exhibitId: { in: exhibits.map((ex: any) => ex.id) } },
    orderBy: [{ exhibitId: 'asc' }, { startTime: 'asc' }]
  });

  const zip = new AdmZip();
  const manifestEntries: Record<string, string> = {};
  const addFile = (zipPath: string, buffer: Buffer, mtime?: Date | null) => {
    const entry = zip.addFile(zipPath, buffer);
    if (mtime && entry?.header) {
      entry.header.time = new Date(mtime);
    }
    manifestEntries[zipPath] = crypto.createHash('sha256').update(buffer).digest('hex');
  };

  addFile(
    'forensic_artifacts/integrity_mode.json',
    Buffer.from(JSON.stringify({
      mode: 'hash-only',
      signed: false,
      reason: 'Proof packet does not include a cryptographic signature bundle.'
    }, null, 2))
  );
  addFile('forensic_artifacts/hashes.json', Buffer.from(JSON.stringify(hashes, null, 2)));
  addFile(
    'forensic_artifacts/audit_chain.json',
    Buffer.from(JSON.stringify(auditSummary.sanitized, null, 2))
  );
  addFile(
    'forensic_artifacts/audit_chain_summary.json',
    Buffer.from(JSON.stringify({
      count: auditSummary.count,
      continuityOk: auditSummary.continuityOk,
      issues: auditSummary.issues,
      firstTimestamp: auditSummary.firstTimestamp,
      lastTimestamp: auditSummary.lastTimestamp
    }, null, 2))
  );
  addFile(
    'forensic_artifacts/claim_proofs.json',
    Buffer.from(JSON.stringify({
      workspaceId,
      matterId,
      generatedAt: new Date().toISOString(),
      totalArtifacts: claimProofArtifacts.length,
      artifacts: claimProofArtifacts
    }, null, 2))
  );
  addFile(
    'forensic_artifacts/proof_contracts.json',
    Buffer.from(JSON.stringify({
      workspaceId,
      matterId,
      generatedAt: new Date().toISOString(),
      totalContracts: proofContracts.length,
      contracts: proofContracts
    }, null, 2))
  );
  addFile(
    'forensic_artifacts/audit_attestation.json',
    Buffer.from(JSON.stringify({
      workspaceId,
      matterId,
      generatedAt: new Date().toISOString(),
      chainVerification,
      ledgerProof: ledgerProof
        ? {
            id: ledgerProof.id,
            workspaceId: ledgerProof.workspaceId,
            eventCount: ledgerProof.eventCount,
            maxEventId: ledgerProof.maxEventId,
            proofHash: ledgerProof.proofHash,
            tamperFlag: ledgerProof.tamperFlag,
            createdAt: ledgerProof.createdAt
          }
        : null
    }, null, 2))
  );
  if (auditSummary.count === 0) {
    addFile(
      'forensic_artifacts/audit_chain_warning.md',
      Buffer.from("# Audit Chain Warning\n\nNo audit events were found for this workspace. Run ingestion or demo seed to populate the chain.\n")
    );
  }

  for (const segment of transcriptSegments) {
    const exhibit = exhibits.find((ex: any) => ex.id === segment.exhibitId);
    const baseName = exhibit ? safeZipName(exhibit.filename) : segment.exhibitId;
    const fileName = `transcripts/${baseName}-${segment.id}.txt`;
    const header = `Exhibit: ${exhibit?.filename ?? segment.exhibitId}\nStart: ${segment.startTime}\nEnd: ${segment.endTime}\n\n`;
    addFile(fileName, Buffer.from(`${header}${segment.text}`));
  }

  const webCaptures = exhibits.filter((ex: any) => ex.type === 'WEB_CAPTURE');
  for (const capture of webCaptures) {
    const fileName = safeZipName(capture.filename || `${capture.id}.png`);
    const buffer = await storageService.download(capture.storageKey);
    verifyExhibitBuffer(capture, buffer);
    const captureTime = capture.originalModifiedAt || capture.originalCreatedAt || capture.createdAt;
    addFile(path.posix.join('web_captures', fileName), buffer, captureTime);
  }

  for (const exhibit of exhibits) {
    const buffer = await storageService.download(exhibit.storageKey);
    verifyExhibitBuffer(exhibit, buffer);
    const safeName = safeZipName(exhibit.filename || `${exhibit.id}`);
    const zipPath = path.posix.join('evidence', `${exhibit.id}-${safeName}`);
    const exhibitTime = exhibit.originalModifiedAt || exhibit.originalCreatedAt || exhibit.createdAt;
    addFile(zipPath, buffer, exhibitTime);
  }

  const auditEventIds = auditChain.map((evt: any) => evt.id).filter(Boolean);
  addFile('chain_of_custody.json', Buffer.from(JSON.stringify(auditChain, null, 2)));
  addFile(
    'chain_verification.json',
    Buffer.from(JSON.stringify({ ...chainVerification, auditEventIds }, null, 2))
  );

  const verifyTemplatePath = path.resolve(process.cwd(), "server", "templates", "proof-packet-verify.js");
  if (fs.existsSync(verifyTemplatePath)) {
    addFile("verify.js", fs.readFileSync(verifyTemplatePath));
  }

  const generatedAt = new Date().toISOString();
  const manifestBase = {
    manifestVersion: 'v1',
    generatedAt,
    workspaceId,
    matterId,
    files: { ...manifestEntries }
  };
  const manifestBaseJson = JSON.stringify(manifestBase, null, 2);
  const manifestHash = crypto.createHash('sha256').update(manifestBaseJson).digest('hex');
  const manifest = {
    ...manifestBase,
    files: {
      ...manifestEntries,
      'manifest.json': manifestHash
    },
    manifestHashAlgorithm: 'sha256',
    manifestHashScope: 'manifest.json computed from manifest without its own entry'
  };
  const manifestJson = JSON.stringify(manifest, null, 2);
  zip.addFile('manifest.json', Buffer.from(manifestJson));
  return {
    buffer: zip.toBuffer(),
    metadata: {
      generatedAt,
      workspaceId,
      matterId
    }
  };
}

export async function generateUnassailablePacket(
  workspaceId: string,
  matterId: string
): Promise<{ buffer: Buffer; metadata: { generatedAt: string; workspaceId: string; matterId: string } }> {
  const matter = await prisma.matter.findFirst({
    where: { id: matterId, workspaceId }
  });
  if (!matter) throw new Error('Matter not found');

  const exhibits = await prisma.exhibit.findMany({
    where: { workspaceId, matterId }
  });

  const sha256Registry = exhibits.map((exhibit: any) => ({
    exhibitId: exhibit.id,
    filename: exhibit.filename,
    sha256: exhibit.integrityHash
  }));

  const auditEvents = await prisma.auditEvent.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' }
  });
  const auditSummary = summarizeAuditChain(auditEvents);
  const chainVerification = await verifyAuditChain(workspaceId);
  const ledgerProof = await prisma.auditLedgerProof.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' }
  });

  const derivedEvents = await prisma.auditEvent.findMany({
    where: { workspaceId, eventType: 'DERIVED_ARTIFACT' },
    orderBy: { createdAt: 'desc' },
    take: 200
  });
  const derivedArtifacts = derivedEvents.map((event: any) => {
    try {
      return JSON.parse(event.payloadJson || '{}');
    } catch {
      return {};
    }
  });
  const exhibitIdSet = new Set(exhibits.map((ex: any) => ex.id));
  const claimProofArtifacts = derivedArtifacts.filter((artifact: any) => {
    const exhibitIds = Array.isArray(artifact?.exhibitIdsUsed) ? artifact.exhibitIdsUsed : [];
    const matchesMatter = exhibitIds.some((id: string) => exhibitIdSet.has(id));
    return matchesMatter && Array.isArray(artifact?.claimProofs) && artifact.claimProofs.length > 0;
  }).map((artifact: any) => {
    const claimProofs = Array.isArray(artifact.claimProofs) ? artifact.claimProofs : [];
    const claimProofHashes = Array.isArray(artifact.claimProofHashes)
      ? artifact.claimProofHashes
      : claimProofs.map((proof: any) => ({
          claimId: proof?.claimId,
          hash: hashClaimProof(proof),
          verification: proof?.verification
        }));
    const claimProofsHash = artifact.claimProofsHash
      || (claimProofHashes.length ? sha256(JSON.stringify(claimProofHashes.map((entry: any) => entry.hash).sort())) : null);
    return {
      requestId: artifact.requestId || null,
      artifactType: artifact.artifactType || 'unknown',
      createdAt: artifact.createdAt || null,
      claimProofsHash,
      claimProofHashes,
      claimProofs
    };
  });
  const proofContracts = derivedArtifacts.filter((artifact: any) => {
    const exhibitIds = Array.isArray(artifact?.exhibitIdsUsed) ? artifact.exhibitIdsUsed : [];
    const matchesMatter = exhibitIds.some((id: string) => exhibitIdSet.has(id));
    return matchesMatter && artifact?.proofContract;
  }).map((artifact: any) => ({
    requestId: artifact.requestId || null,
    artifactType: artifact.artifactType || 'unknown',
    createdAt: artifact.createdAt || null,
    proofContractHash: artifact.proofContractHash || null,
    replayHash: artifact.replayHash || null,
    proofContract: artifact.proofContract
  }));

  const zip = new AdmZip();
  const sha256Lines: string[] = [];
  const packetTimestamp = String(process.env.DEMO_FIXED_TIMESTAMP || new Date().toISOString());
  const manifestEntries: Array<{ path: string; sha256: string; size: number; createdAt: string }> = [];
  const recordFile = (zipPath: string, buffer: Buffer) => {
    zip.addFile(zipPath, buffer);
    manifestEntries.push({
      path: zipPath,
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      size: buffer.length,
      createdAt: packetTimestamp
    });
  };

  recordFile(
    'NOTICE_NOT_LEGAL_ADVICE.md',
    Buffer.from(
      "# Notice\n\nNot a lawyer. Not legal advice. Procedural help + document organization only.\n"
    )
  );

  recordFile(
    'forensic_metadata/integrity_mode.json',
    Buffer.from(JSON.stringify({
      mode: 'hash-only',
      signed: false,
      reason: 'Unassailable packet ships hash registry without signature bundle.'
    }, null, 2))
  );
  recordFile(
    'forensic_metadata/sha256_registry.json',
    Buffer.from(JSON.stringify(sha256Registry, null, 2))
  );
  recordFile(
    'forensic_metadata/immutable_audit.json',
    Buffer.from(JSON.stringify(auditEvents, null, 2))
  );
  recordFile(
    'forensic_metadata/audit_chain_sanitized.json',
    Buffer.from(JSON.stringify(auditSummary.sanitized, null, 2))
  );
  recordFile(
    'forensic_metadata/audit_chain_summary.json',
    Buffer.from(JSON.stringify({
      count: auditSummary.count,
      continuityOk: auditSummary.continuityOk,
      issues: auditSummary.issues,
      firstTimestamp: auditSummary.firstTimestamp,
      lastTimestamp: auditSummary.lastTimestamp
    }, null, 2))
  );
  recordFile(
    'forensic_metadata/claim_proofs.json',
    Buffer.from(JSON.stringify({
      workspaceId,
      matterId,
      generatedAt: packetTimestamp,
      totalArtifacts: claimProofArtifacts.length,
      artifacts: claimProofArtifacts
    }, null, 2))
  );
  recordFile(
    'forensic_metadata/proof_contracts.json',
    Buffer.from(JSON.stringify({
      workspaceId,
      matterId,
      generatedAt: packetTimestamp,
      totalContracts: proofContracts.length,
      contracts: proofContracts
    }, null, 2))
  );
  recordFile(
    'forensic_metadata/audit_attestation.json',
    Buffer.from(JSON.stringify({
      workspaceId,
      matterId,
      generatedAt: packetTimestamp,
      chainVerification,
      ledgerProof: ledgerProof
        ? {
            id: ledgerProof.id,
            workspaceId: ledgerProof.workspaceId,
            eventCount: ledgerProof.eventCount,
            maxEventId: ledgerProof.maxEventId,
            proofHash: ledgerProof.proofHash,
            tamperFlag: ledgerProof.tamperFlag,
            createdAt: ledgerProof.createdAt
          }
        : null
    }, null, 2))
  );
  if (auditSummary.count === 0) {
    recordFile(
      'forensic_metadata/audit_chain_warning.md',
      Buffer.from("# Audit Chain Warning\n\nNo audit events were found for this workspace. Run ingestion or demo seed to populate the chain.\n")
    );
  }

  const webCaptures = exhibits.filter((ex: any) => ex.type === 'WEB_CAPTURE');
  for (const capture of webCaptures) {
    const fileName = safeZipName(capture.filename || `${capture.id}.png`);
    const buffer = await storageService.download(capture.storageKey);
    verifyExhibitBuffer(capture, buffer);
    const zipPath = path.posix.join('exhibit_snapshots', fileName);
    recordFile(zipPath, buffer);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    sha256Lines.push(`${hash}  ${zipPath}`);
  }

  const serverRoot = fs.existsSync(path.join(process.cwd(), "server", "exhibit_snapshots"))
    ? path.join(process.cwd(), "server")
    : process.cwd();
  const proofDir = path.join(serverRoot, "exhibit_snapshots");
  if (fs.existsSync(proofDir)) {
    const files = fs.readdirSync(proofDir).filter((file) => file.endsWith(".png"));
    for (const file of files) {
      const buffer = fs.readFileSync(path.join(proofDir, file));
      const zipPath = path.posix.join("process_proof", safeZipName(file));
      recordFile(zipPath, buffer);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      sha256Lines.push(`${hash}  ${zipPath}`);
    }
  }

  if (sha256Lines.length) {
    recordFile(
      "forensic_metadata/sha256_registry.sha256",
      Buffer.from(`${sha256Lines.join("\n")}\n`)
    );
  }

  const protocol = [
    "# Forensic Verification Protocol",
    "",
    "1) Extract the ZIP archive.",
    "2) Verify hashes: sha256sum -c forensic_metadata/sha256_registry.sha256",
    "3) Confirm audit chain: inspect forensic_metadata/immutable_audit.json for hash continuity.",
    ""
  ].join("\\n");
  recordFile("forensic_verification_protocol.md", Buffer.from(protocol));

  const verifyTemplatePath = path.resolve(process.cwd(), "server", "templates", "proof-packet-verify.js");
  if (fs.existsSync(verifyTemplatePath)) {
    recordFile("verify.js", fs.readFileSync(verifyTemplatePath));
  }

  let signerKeyId: string | null = null;
  let signingAlgorithm: string | null = null;
  let signatureStatus: 'signed' | 'unsigned' = 'unsigned';
  let signatureB64: string | null = null;
  try {
    signerKeyId = getPublicKeyFingerprint();
    signingAlgorithm = getSigningAlgorithm();
    signatureStatus = 'signed';
  } catch {
    signatureStatus = 'unsigned';
  }

  recordFile("verification_key.pem", Buffer.from(getPublicKeyPem()));

  let manifest = {
    packetContractVersion: "v1",
    workspaceId,
    matterId,
    integrityMode: signatureStatus === 'signed' ? 'signed' : 'hash-only',
    signatureStatus,
    signerKeyId,
    createdAt: packetTimestamp,
    files: manifestEntries
  };

  let manifestJson = JSON.stringify(manifest, null, 2);
  if (signatureStatus === 'signed') {
    try {
      signatureB64 = signPayload(manifestJson);
    } catch {
      signatureStatus = 'unsigned';
    }
  }
  if (signatureStatus !== manifest.signatureStatus) {
    manifest = {
      ...manifest,
      integrityMode: signatureStatus === 'signed' ? 'signed' : 'hash-only',
      signatureStatus
    };
    manifestJson = JSON.stringify(manifest, null, 2);
  }

  const signatureBundle = {
    status: signatureStatus,
    signatureB64: signatureB64 || "",
    algorithm: signingAlgorithm,
    signerKeyId,
    createdAt: packetTimestamp
  };

  zip.addFile("manifest.json", Buffer.from(manifestJson));
  zip.addFile("manifest.sig", Buffer.from(JSON.stringify(signatureBundle, null, 2)));

  const generatedAt = packetTimestamp;
  return {
    buffer: zip.toBuffer(),
    metadata: {
      generatedAt,
      workspaceId,
      matterId
    }
  };
}
