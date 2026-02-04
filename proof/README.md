# Proof Packet

The Proof Packet is a ZIP artifact that bundles forensic evidence for audit.

## Contents
- `forensic_artifacts/hashes.json`: Exhibit ID -> SHA-256 fingerprint mapping.
- `forensic_artifacts/audit_chain.json`: Hash-linked audit events (sanitized).
- `forensic_artifacts/audit_chain_summary.json`: Continuity summary and counts.
- `forensic_artifacts/claim_proofs.json`: Claim-level anchors + hash rollups.
- `forensic_artifacts/proof_contracts.json`: Proof contracts + replay hashes.
- `forensic_artifacts/audit_attestation.json`: Chain verification + ledger proof.
- `chain_of_custody.json`: Full audit chain used for verification.
- `chain_verification.json`: Chain verification output + audit event ids.
- `transcripts/*.txt`: Transcript segments used in reports.
- `web_captures/*.png`: Visual Witness captures.
- `evidence/*`: Original exhibit binaries.
- `verify.js`: Offline verification script.
- `manifest.json`: Proof packet manifest (hash registry).

## Generate
Run the proof packet generator for the State v. Nexus demo:
```
# from repo root
$env:OUT_PATH="$env:USERPROFILE\Downloads\ProofPacket-State-v-Nexus.zip"
cd server
npx tsx -e "import fs from 'fs'; import { prisma } from './lib/prisma.ts'; import { generateProofPacket } from './services/packagingService.ts'; (async () => { const ws = await prisma.workspace.findFirst({ where: { name: 'State v. Nexus' } }); const matter = await prisma.matter.findFirst({ where: { workspaceId: ws.id, slug: 'state-v-nexus' } }); const result = await generateProofPacket(ws.id, matter.id); fs.writeFileSync(process.env.OUT_PATH, result.buffer); await prisma.$disconnect(); })();"
```

The output ZIP is written to your Downloads folder.

## Verify (offline)
```
node verify.js <extracted-packet-directory>
```
