# LexiPro Substrate API Contract (v1)

This contract defines the minimum surface required to integrate LexiPro as an enforcement substrate.

## Authentication
- `Authorization: Bearer <jwt>`
- `x-workspace-id: <workspaceId>`

## Core Endpoints

### 1) Enforcement Gate (grounded response)
`POST /api/ai/chat`

Body:
```json
{
  "userPrompt": "string",
  "promptKey": "forensic_synthesis",
  "matterId": "string"
}
```

Success (200):
```json
{
  "ok": true,
  "proof": {
    "requestId": "string",
    "contract": {
      "version": "v1",
      "policyId": "string",
      "policyHash": "string",
      "decision": "RELEASED|WITHHELD_422",
      "evidenceDigest": "string",
      "promptKey": "string",
      "provider": "string",
      "model": "string",
      "temperature": 0.1,
      "guardrailsHash": "string",
      "releaseCert": {
        "version": "string",
        "kid": "string",
        "policyHash": "string"
      },
      "anchorCount": 1,
      "claimCount": 1,
      "createdAt": "timestamp"
    },
    "contractHash": "string",
    "claims": [
      {
        "claimId": "string",
        "claim": "string",
        "anchorIds": ["string"],
        "sourceSpans": [
          {
            "anchorId": "string",
            "exhibitId": "string",
            "pageNumber": 1,
            "lineNumber": 1,
            "bbox": [0,0,1000,1000],
            "spanText": "string",
            "integrityStatus": "PENDING|CERTIFIED|REVOKED",
            "integrityHash": "string"
          }
        ],
        "verification": {
          "grounding": "PASS|FAIL",
          "semantic": "PASS|FAIL",
          "audit": "PASS|FAIL",
          "releaseGate": "PASS|FAIL"
        }
      }
    ]
  },
  "anchorsById": {
    "anchorId": {
      "id": "string",
      "exhibitId": "string",
      "pageNumber": 1,
      "lineNumber": 1,
      "bbox": [0,0,1000,1000],
      "text": "string",
      "integrityHash": "string"
    }
  }
}
```

Failure (422):
```json
{
  "ok": false,
  "errorCode": "NO_ANCHOR_NO_OUTPUT|WITHHELD",
  "message": "string",
  "reasons": ["string"],
  "auditEventId": "string"
}
```

### 2) Proof Packet (offline verification)
`GET /api/workspaces/:workspaceId/matters/:matterId/proof-packet`

Returns ZIP with:
- `forensic_artifacts/claim_proofs.json`
- `forensic_artifacts/proof_contracts.json`
- `forensic_artifacts/audit_attestation.json`
- `chain_of_custody.json`
- `manifest.json` + `signature.ed25519`

### 3) Lineage Summary (latest trust state)
`GET /api/workspaces/:workspaceId/trust/lineage/latest`

Returns:
```json
{
  "artifacts": [
    {
      "artifactType": "chat_response",
      "createdAt": "timestamp",
      "integritySnapshot": [],
      "claimProofSummary": {
        "totalClaims": 1,
        "groundingPass": 1,
        "semanticPass": 1,
        "auditPass": 1,
        "releaseGatePass": 1,
        "claimProofsHash": "string"
      }
    }
  ]
}
```

### 4) Trust Attestation (latest proof contract)
`GET /api/workspaces/:workspaceId/trust/attestation/latest`

Returns:
```json
{
  "latest": {
    "requestId": "string",
    "artifactType": "chat_response",
    "createdAt": "timestamp",
    "proofContract": {},
    "proofContractHash": "string",
    "replayHash": "string"
  },
  "chainVerification": {
    "valid": true,
    "eventCount": 123,
    "headHash": "string",
    "lastEventId": "string",
    "genesisHash": "string"
  },
  "ledgerProof": {
    "id": "string",
    "workspaceId": "string",
    "eventCount": 123,
    "maxEventId": "string",
    "proofHash": "string",
    "tamperFlag": false,
    "createdAt": "timestamp"
  }
}
```

## Integration Policy (non-negotiable)
- If `/api/ai/chat` returns 422, **do not ship** any answer downstream.
- Store `proof.requestId` alongside your output.
- Verify proof packets offline before external sharing.
