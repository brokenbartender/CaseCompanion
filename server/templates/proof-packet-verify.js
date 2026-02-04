import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizePem(value) {
  return value.replace(/\\n/g, "\n").trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readJsonIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

function verifySignature(payload, signatureB64, publicKeyPem) {
  const keyObj = crypto.createPublicKey(publicKeyPem);
  const options = keyObj.asymmetricKeyType === "rsa" || keyObj.asymmetricKeyType === "rsa-pss"
    ? { key: keyObj, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }
    : { key: keyObj };
  return crypto.verify("sha256", Buffer.from(payload), options, Buffer.from(signatureB64, "base64"));
}

function normalizeClaimProof(proof) {
  const anchorIds = Array.isArray(proof?.anchorIds) ? proof.anchorIds.map(String).sort() : [];
  const spans = Array.isArray(proof?.sourceSpans) ? proof.sourceSpans.map((span) => ({
    anchorId: span?.anchorId ?? null,
    exhibitId: span?.exhibitId ?? null,
    pageNumber: span?.pageNumber ?? null,
    lineNumber: span?.lineNumber ?? null,
    bbox: span?.bbox ?? null,
    spanText: span?.spanText ?? null,
    integrityStatus: span?.integrityStatus ?? null,
    integrityHash: span?.integrityHash ?? null
  })) : [];
  spans.sort((a, b) => {
    const aKey = `${a.anchorId || ""}:${a.exhibitId || ""}:${a.pageNumber ?? ""}:${a.lineNumber ?? ""}`;
    const bKey = `${b.anchorId || ""}:${b.exhibitId || ""}:${b.pageNumber ?? ""}:${b.lineNumber ?? ""}`;
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

function hashClaimProof(proof) {
  return sha256Text(JSON.stringify(normalizeClaimProof(proof)));
}

function normalizeProofContract(contract) {
  if (!contract) return null;
  return {
    version: contract.version,
    policyId: contract.policyId,
    policyHash: contract.policyHash,
    decision: contract.decision,
    evidenceDigest: contract.evidenceDigest,
    promptKey: contract.promptKey,
    provider: contract.provider,
    model: contract.model,
    temperature: contract.temperature,
    guardrailsHash: contract.guardrailsHash,
    releaseCert: {
      version: contract.releaseCert?.version,
      kid: contract.releaseCert?.kid,
      policyHash: contract.releaseCert?.policyHash
    },
    anchorCount: contract.anchorCount,
    claimCount: contract.claimCount,
    createdAt: contract.createdAt
  };
}

function hashProofContract(contract) {
  const normalized = normalizeProofContract(contract);
  if (!normalized) return null;
  return sha256Text(JSON.stringify(normalized));
}

function main() {
  const packetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const manifestPath = path.join(packetDir, "manifest.json");
  const signaturePath = path.join(packetDir, "manifest.sig");
  const publicKeyPath = path.join(packetDir, "verification_key.pem");

  if (!fs.existsSync(manifestPath)) {
    console.error("FAIL: manifest.json missing.");
    process.exit(1);
  }

  const manifestRaw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(manifestRaw);
  const signatureBundle = readJsonIfExists(signaturePath);

  if (signatureBundle && signatureBundle.status === "signed") {
    if (!fs.existsSync(publicKeyPath)) {
      console.error("FAIL: verification_key.pem missing for signed manifest.");
      process.exit(1);
    }
    const publicKeyPem = normalizePem(fs.readFileSync(publicKeyPath, "utf-8"));
    const signatureB64 = String(signatureBundle.signatureB64 || "");
    if (!signatureB64) {
      console.error("FAIL: manifest.sig missing signatureB64.");
      process.exit(1);
    }
    const signatureOk = verifySignature(manifestRaw, signatureB64, publicKeyPem);
    if (!signatureOk) {
      console.error("FAIL: Signature verification failed.");
      process.exit(1);
    }
  }

  const files = Array.isArray(manifest.files)
    ? manifest.files
    : (manifest.files && typeof manifest.files === "object")
      ? Object.entries(manifest.files).map(([relPath, sha256]) => ({
          path: relPath,
          sha256: String(sha256 || "")
        }))
      : [];
  const missing = [];
  const mismatched = [];

  for (const entry of files) {
    const relPath = String(entry?.path || "");
    if (!relPath) continue;
    const absPath = path.join(packetDir, relPath);
    if (!fs.existsSync(absPath)) {
      missing.push(relPath);
      continue;
    }
    if (relPath === "manifest.json" && manifest?.manifestHashScope) {
      const manifestBase = { ...manifest };
      delete manifestBase.manifestHashAlgorithm;
      delete manifestBase.manifestHashScope;
      if (manifestBase.files && typeof manifestBase.files === "object" && !Array.isArray(manifestBase.files)) {
        delete manifestBase.files["manifest.json"];
      }
      const expected = sha256Text(JSON.stringify(manifestBase, null, 2));
      if (expected !== entry.sha256) {
        mismatched.push({ path: relPath, expected: entry.sha256, actual: expected });
      }
      continue;
    }
    const buffer = fs.readFileSync(absPath);
    const digest = sha256(buffer);
    if (digest !== entry.sha256) {
      mismatched.push({ path: relPath, expected: entry.sha256, actual: digest });
    }
    const size = buffer.length;
    if (typeof entry.size === "number" && size !== entry.size) {
      mismatched.push({ path: relPath, expected: entry.size, actual: size, kind: "size" });
    }
  }

  if (missing.length || mismatched.length) {
    console.error("FAIL: Digest verification failed.");
    if (missing.length) {
      console.error(`Missing files: ${missing.join(", ")}`);
    }
    if (mismatched.length) {
      for (const entry of mismatched) {
        console.error(`Mismatch: ${entry.path} expected ${entry.expected} got ${entry.actual}`);
      }
    }
    process.exit(1);
  }

  const claimProofCandidates = [
    path.join(packetDir, "forensic_artifacts", "claim_proofs.json"),
    path.join(packetDir, "forensic_metadata", "claim_proofs.json"),
    path.join(packetDir, "claim_proofs.json")
  ];
  const claimProofPath = claimProofCandidates.find((candidate) => fs.existsSync(candidate));
  const claimProofHashByRequestId = new Map();
  if (claimProofPath) {
    const claimProofPayload = readJson(claimProofPath);
    const artifacts = Array.isArray(claimProofPayload?.artifacts) ? claimProofPayload.artifacts : [];
    for (const artifact of artifacts) {
      const claimProofs = Array.isArray(artifact?.claimProofs) ? artifact.claimProofs : [];
      const expectedHashes = Array.isArray(artifact?.claimProofHashes) ? artifact.claimProofHashes : [];
      if (!claimProofs.length || !expectedHashes.length) continue;
      const recomputed = claimProofs.map((proof) => ({
        claimId: proof?.claimId,
        hash: hashClaimProof(proof)
      }));
      for (const entry of expectedHashes) {
        const match = recomputed.find((r) => r.claimId === entry.claimId);
        if (!match || match.hash !== entry.hash) {
          console.error(`FAIL: Claim proof hash mismatch for ${entry.claimId || "unknown"}.`);
          process.exit(1);
        }
      }
      if (artifact?.claimProofsHash) {
        const rollup = sha256Text(JSON.stringify(recomputed.map((entry) => entry.hash).sort()));
        if (rollup !== artifact.claimProofsHash) {
          console.error("FAIL: Claim proof rollup hash mismatch.");
          process.exit(1);
        }
        if (artifact?.requestId) {
          claimProofHashByRequestId.set(String(artifact.requestId), artifact.claimProofsHash);
        }
      } else if (artifact?.requestId && Array.isArray(artifact?.claimProofHashes) && artifact.claimProofHashes.length) {
        const rollup = sha256Text(JSON.stringify(artifact.claimProofHashes.map((entry) => entry.hash).sort()));
        claimProofHashByRequestId.set(String(artifact.requestId), rollup);
      }
    }
  }

  const contractCandidates = [
    path.join(packetDir, "forensic_artifacts", "proof_contracts.json"),
    path.join(packetDir, "forensic_metadata", "proof_contracts.json"),
    path.join(packetDir, "proof_contracts.json")
  ];
  const contractPath = contractCandidates.find((candidate) => fs.existsSync(candidate));
  if (contractPath) {
    const payload = readJson(contractPath);
    const contracts = Array.isArray(payload?.contracts) ? payload.contracts : [];
    for (const entry of contracts) {
      if (!entry?.proofContract) continue;
      const expected = entry.proofContractHash;
      const actual = hashProofContract(entry.proofContract);
      if (expected && actual && expected !== actual) {
        console.error(`FAIL: Proof contract hash mismatch for ${entry.requestId || "unknown"}.`);
        process.exit(1);
      }
      const requestId = entry?.requestId ? String(entry.requestId) : null;
      const claimProofsHash = requestId ? claimProofHashByRequestId.get(requestId) : null;
      if (entry?.replayHash && entry?.proofContractHash && claimProofsHash) {
        const replayExpected = sha256Text(JSON.stringify({
          proofContractHash: entry.proofContractHash,
          claimProofsHash
        }));
        if (replayExpected !== entry.replayHash) {
          console.error(`FAIL: Replay hash mismatch for ${requestId || "unknown"}.`);
          process.exit(1);
        }
      }
    }
  }

  const chainVerificationPath = path.join(packetDir, "chain_verification.json");
  const chainOfCustodyPath = path.join(packetDir, "chain_of_custody.json");
  const chainVerification = readJsonIfExists(chainVerificationPath);
  const chainOfCustody = readJsonIfExists(chainOfCustodyPath);
  if (chainVerification && chainOfCustody) {
    const auditEventIds = Array.isArray(chainVerification?.auditEventIds) ? chainVerification.auditEventIds : [];
    const custodyIds = Array.isArray(chainOfCustody) ? chainOfCustody.map((evt) => evt?.id).filter(Boolean) : [];
    if (auditEventIds.length && custodyIds.length && auditEventIds.length !== custodyIds.length) {
      console.error("FAIL: chain_verification auditEventIds length mismatch.");
      process.exit(1);
    }
    if (auditEventIds.length && custodyIds.length) {
      for (let i = 0; i < auditEventIds.length; i += 1) {
        if (String(auditEventIds[i]) !== String(custodyIds[i])) {
          console.error("FAIL: chain_verification auditEventIds do not match chain_of_custody order.");
          process.exit(1);
        }
      }
    }
    if (chainVerification?.valid === false) {
      console.error("FAIL: chain_verification marked invalid.");
      process.exit(1);
    }
    if (typeof chainVerification?.eventCount === "number" && custodyIds.length && chainVerification.eventCount !== custodyIds.length) {
      console.error("FAIL: chain_verification eventCount mismatch.");
      process.exit(1);
    }
    const lastEvent = Array.isArray(chainOfCustody) && chainOfCustody.length
      ? chainOfCustody[chainOfCustody.length - 1]
      : null;
    if (lastEvent && chainVerification?.headHash && String(chainVerification.headHash) !== String(lastEvent?.hash)) {
      console.error("FAIL: chain_verification headHash mismatch.");
      process.exit(1);
    }
    if (lastEvent && chainVerification?.lastEventId && String(chainVerification.lastEventId) !== String(lastEvent?.id)) {
      console.error("FAIL: chain_verification lastEventId mismatch.");
      process.exit(1);
    }
  }

  const attestationCandidates = [
    path.join(packetDir, "forensic_artifacts", "audit_attestation.json"),
    path.join(packetDir, "forensic_metadata", "audit_attestation.json"),
    path.join(packetDir, "audit_attestation.json")
  ];
  const attestationPath = attestationCandidates.find((candidate) => fs.existsSync(candidate));
  if (attestationPath) {
    const attestation = readJson(attestationPath);
    const attestedChain = attestation?.chainVerification || null;
    if (attestedChain && chainVerification) {
      const fields = ["valid", "eventCount", "headHash", "lastEventId", "genesisHash"];
      for (const field of fields) {
        if (attestedChain[field] !== undefined && chainVerification[field] !== undefined && attestedChain[field] !== chainVerification[field]) {
          console.error(`FAIL: audit_attestation chainVerification mismatch on ${field}.`);
          process.exit(1);
        }
      }
    }
    const ledgerProof = attestation?.ledgerProof;
    if (ledgerProof?.tamperFlag) {
      console.error("FAIL: audit_attestation ledgerProof tamperFlag is true.");
      process.exit(1);
    }
    if (ledgerProof && chainVerification) {
      if (typeof chainVerification?.eventCount === "number" && ledgerProof?.eventCount !== chainVerification.eventCount) {
        console.error("FAIL: audit_attestation ledgerProof eventCount mismatch.");
        process.exit(1);
      }
      if (chainVerification?.lastEventId && ledgerProof?.maxEventId && String(chainVerification.lastEventId) !== String(ledgerProof.maxEventId)) {
        console.error("FAIL: audit_attestation ledgerProof maxEventId mismatch.");
        process.exit(1);
      }
      if (ledgerProof?.workspaceId && ledgerProof?.proofHash) {
        const headHash = chainVerification?.headHash ?? "NONE";
        const proofExpected = sha256Text(`${ledgerProof.workspaceId}:${ledgerProof.eventCount}:${ledgerProof.maxEventId}:${headHash}`);
        if (ledgerProof?.proofHash && ledgerProof.proofHash !== proofExpected) {
          console.error("FAIL: audit_attestation ledgerProof hash mismatch.");
          process.exit(1);
        }
      }
    }
  }

  console.log("PASS: Proof packet verified.");
}

main();
