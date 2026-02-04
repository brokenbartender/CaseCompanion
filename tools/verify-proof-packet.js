import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function normalizePem(value) {
  return value.replace(/\\n/g, "\n").trim();
}

function getPublicKey(packetDir) {
  const localPath = path.join(packetDir, "verification_key.pem");
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath, "utf-8");
  }
  const packetKey = path.join(packetDir, "public_key.pem");
  if (fs.existsSync(packetKey)) {
    return fs.readFileSync(packetKey, "utf-8");
  }
  const envKey = process.env.PUBLIC_KEY_PEM ? normalizePem(process.env.PUBLIC_KEY_PEM) : "";
  return envKey || null;
}

function verifySignature(payload, signatureB64, publicKeyPem) {
  const keyObj = crypto.createPublicKey(publicKeyPem);
  const isRsa = keyObj.asymmetricKeyType === "rsa" || keyObj.asymmetricKeyType === "rsa-pss";
  const isEd25519 = keyObj.asymmetricKeyType === "ed25519";
  const options = isRsa
    ? { key: keyObj, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }
    : { key: keyObj };
  const algorithm = isEd25519 ? null : "sha256";
  return crypto.verify(algorithm, Buffer.from(payload), options, Buffer.from(signatureB64, "base64"));
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

function findClaimProofPath(packetDir) {
  const candidates = [
    path.join(packetDir, "claim_proofs.json"),
    path.join(packetDir, "forensic_artifacts", "claim_proofs.json"),
    path.join(packetDir, "forensic_metadata", "claim_proofs.json")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function verifyClaimProofs(packetDir) {
  const claimProofPath = findClaimProofPath(packetDir);
  if (!claimProofPath) return;

  const payload = readJson(claimProofPath);
  const artifacts = Array.isArray(payload?.artifacts) ? payload.artifacts : [];
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
        throw new Error(`Claim proof hash mismatch for ${entry.claimId || "unknown"}.`);
      }
    }
    if (artifact?.claimProofsHash) {
      const rollup = sha256Text(JSON.stringify(recomputed.map((entry) => entry.hash).sort()));
      if (rollup !== artifact.claimProofsHash) {
        throw new Error("Claim proof rollup hash mismatch.");
      }
    }
  }
}

function findAuditChainPath(packetDir) {
  const candidates = [
    path.join(packetDir, "forensic_artifacts", "audit_chain.json"),
    path.join(packetDir, "forensic_metadata", "audit_chain_sanitized.json"),
    path.join(packetDir, "forensic_metadata", "immutable_audit.json"),
    path.join(packetDir, "chain_of_custody.json")
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function verifyAuditChainContinuity(packetDir) {
  const auditPath = findAuditChainPath(packetDir);
  if (!auditPath) return;
  const entries = readJson(auditPath);
  if (!Array.isArray(entries) || entries.length < 2) return;
  for (let i = 1; i < entries.length; i += 1) {
    const prev = entries[i - 1];
    const current = entries[i];
    if (!current?.previous_link && !current?.prevHash) continue;
    const expected = current.previous_link ?? current.prevHash;
    const actual = prev.hash ?? prev?.hash;
    if (expected && actual && expected !== actual) {
      throw new Error(`Audit chain continuity break at index ${i}.`);
    }
  }
}

function main() {
  const packetDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
  if (!packetDir) {
    console.error("Usage: node tools/verify-proof-packet.js <packet-dir>");
    process.exit(1);
  }

  const manifestPath = path.join(packetDir, "chain_of_custody.json");
  const signaturePath = path.join(packetDir, "manifest.sig");

  const hasLegacy = fs.existsSync(manifestPath) && fs.existsSync(signaturePath);
  const v2Manifest = path.join(packetDir, "manifest.json");
  const v2Hashes = path.join(packetDir, "hashes.txt");
  const v2Sig = path.join(packetDir, "signature.ed25519");

  if (!hasLegacy && (!fs.existsSync(v2Manifest) || !fs.existsSync(v2Hashes) || !fs.existsSync(v2Sig))) {
    console.error("FAIL: Missing chain_of_custody.json/manifest.sig or manifest.json/hashes.txt/signature.ed25519.");
    process.exit(1);
  }

  let manifest = {};
  let fileDigests = [];
  const publicKeyPem = getPublicKey(packetDir);
  if (!publicKeyPem) {
    console.error("FAIL: verification_key.pem/public_key.pem missing and PUBLIC_KEY_PEM not set.");
    process.exit(1);
  }

  if (hasLegacy) {
    const manifestRaw = fs.readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestRaw);
    const signatureBundle = readJson(signaturePath);

    if (signatureBundle.status !== "signed") {
      console.error(`FAIL: Manifest is ${signatureBundle.status || "unsigned"}.`);
      process.exit(1);
    }

    const signatureB64 = signatureBundle.signatureB64 || "";
    if (!signatureB64) {
      console.error("FAIL: manifest.sig missing signatureB64.");
      process.exit(1);
    }

    const signatureOk = verifySignature(manifestRaw, signatureB64, publicKeyPem);
    if (!signatureOk) {
      console.error("FAIL: Signature verification failed.");
      process.exit(1);
    }

    fileDigests = Array.isArray(manifest.fileDigests) ? manifest.fileDigests : [];
  } else {
    const manifestRaw = fs.readFileSync(v2Manifest, "utf-8");
    manifest = JSON.parse(manifestRaw);
    const signatureB64 = fs.readFileSync(v2Sig, "utf-8").trim();
    const hashesRaw = fs.readFileSync(v2Hashes, "utf-8");

    const walk = (dir) => {
      const out = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          out.push(...walk(full));
        } else {
          out.push(full);
        }
      }
      return out;
    };

    const coreFiles = walk(packetDir).filter((filePath) => {
      const rel = path.relative(packetDir, filePath).replace(/\\/g, "/");
      return !["manifest.json", "hashes.txt", "signature.ed25519", "public_key.pem"].includes(rel);
    });

    const coreManifest = {
      ...manifest,
      files: Array.isArray(manifest.files)
        ? manifest.files.filter((entry) => !["manifest.json", "hashes.txt", "signature.ed25519", "public_key.pem"].includes(String(entry?.path || "")))
        : []
    };

    const hashesCoreLines = coreFiles.map((filePath) => {
      const relPath = path.relative(packetDir, filePath).replace(/\\/g, "/");
      const digest = sha256(fs.readFileSync(filePath));
      return `${digest}  ${relPath}`;
    });
    const hashesCore = `${hashesCoreLines.join("\n")}\n`;
    const signaturePayload = `${JSON.stringify(coreManifest, null, 2)}\n---\n${hashesCore}`;

    const signatureOk = verifySignature(signaturePayload, signatureB64, publicKeyPem);
    if (!signatureOk) {
      console.error("FAIL: Signature verification failed.");
      process.exit(1);
    }

    fileDigests = Array.isArray(manifest.files) ? manifest.files : [];
  }
  const missing = [];
  const mismatched = [];

  for (const entry of fileDigests) {
    const relPath = String(entry?.path || "");
    if (!relPath) continue;
    const absPath = path.join(packetDir, relPath);
    if (!fs.existsSync(absPath)) {
      missing.push(relPath);
      continue;
    }
    const digest = sha256(fs.readFileSync(absPath));
    if (digest !== entry.sha256) {
      mismatched.push({ path: relPath, expected: entry.sha256, actual: digest });
    }
  }

  if (hasLegacy) {
    const manifestClone = JSON.parse(JSON.stringify(manifest));
    if (manifestClone.integrity && typeof manifestClone.integrity === "object") {
      manifestClone.integrity.manifestHash = "";
    }
    const canonical = JSON.stringify(manifestClone, null, 2);
    const computedRootHash = sha256(Buffer.from(canonical, "utf-8"));
    const declaredRootHash = manifest?.integrity?.manifestHash || "";

    if (computedRootHash !== declaredRootHash) {
      mismatched.push({ path: "chain_of_custody.json", expected: declaredRootHash, actual: computedRootHash });
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

  try {
    verifyClaimProofs(packetDir);
    verifyAuditChainContinuity(packetDir);
  } catch (err) {
    console.error(`FAIL: ${err?.message || String(err)}`);
    process.exit(1);
  }

  console.log("PASS: Proof packet verified.");
}

main();
