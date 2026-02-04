-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'admin', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEPROVISIONED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'CERTIFIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('DRAFT', 'PRODUCED', 'WITHHELD');

-- CreateEnum
CREATE TYPE "SystemAuditStatus" AS ENUM ('SUCCESS', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IntegrityAlertType" AS ENUM ('HASH_MISMATCH', 'FILE_MISSING', 'CHAIN_BREAK', 'SYSTEM_INTEGRITY_FAILURE');

-- CreateEnum
CREATE TYPE "IntegrityAlertSeverity" AS ENUM ('CRITICAL', 'WARNING');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('CLIO', 'GMAIL', 'ONEDRIVE');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "DeadlineStatus" AS ENUM ('DETECTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ChronologyRunStatus" AS ENUM ('RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspacePreference" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspacePreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceSecret" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "ciphertextB64" TEXT NOT NULL,
    "ivB64" TEXT NOT NULL,
    "tagB64" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OidcState" (
    "state" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "nonce" TEXT,
    "workspaceId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OidcState_pkey" PRIMARY KEY ("state")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspaceId","userId")
);

-- CreateTable
CREATE TABLE "Matter" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "jurisdiction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exhibit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "integrityHash" TEXT NOT NULL,
    "batesNumber" TEXT,
    "batesSequence" INTEGER,
    "productionStatus" "ProductionStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "reasonForDeletion" TEXT,
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exhibit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anchor" (
    "id" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "bboxJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anchor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "batesNumber" TEXT,
    "sourcePath" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "embedding" vector NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "action" TEXT,
    "resourceId" TEXT,
    "payloadJson" TEXT NOT NULL,
    "detailsJson" TEXT,
    "query" TEXT,
    "response" TEXT,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAudit" (
    "auditId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "totalFilesScanned" INTEGER NOT NULL,
    "integrityFailuresCount" INTEGER NOT NULL,
    "status" "SystemAuditStatus" NOT NULL,
    "previous_log_hash" TEXT,
    "audit_signature" TEXT NOT NULL DEFAULT '',
    "resourceIdsJson" TEXT NOT NULL DEFAULT '[]',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemAudit_pkey" PRIMARY KEY ("auditId")
);

-- CreateTable
CREATE TABLE "AuditLedgerProof" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "maxEventId" TEXT NOT NULL,
    "proofHash" TEXT NOT NULL,
    "tamperFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLedgerProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatesReservation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "exhibitId" TEXT,
    "reservedBy" TEXT NOT NULL,
    "certificate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatesReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InferenceState" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exhibitId" TEXT,
    "caseId" TEXT,
    "stepIndex" INTEGER NOT NULL,
    "heartbeatHash" TEXT NOT NULL,
    "evidenceHash" TEXT,
    "stateJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InferenceState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rulesJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clause" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "sourceChunkId" TEXT,
    "clauseType" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "clauseId" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "severity" "RiskLevel" NOT NULL,
    "redlineSuggestion" TEXT NOT NULL,
    "triggerMatchesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "sourceText" TEXT NOT NULL,
    "sourceChunkId" TEXT,
    "status" "DeadlineStatus" NOT NULL DEFAULT 'DETECTED',
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "credentials" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalResource" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrityAlert" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "exhibitId" TEXT,
    "type" "IntegrityAlertType" NOT NULL,
    "severity" "IntegrityAlertSeverity" NOT NULL DEFAULT 'CRITICAL',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tombstone" (
    "id" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "authorizedByUserId" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tombstone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChronologyRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" "ChronologyRunStatus" NOT NULL DEFAULT 'RUNNING',
    "metricsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChronologyRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChronologyEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "matterId" TEXT NOT NULL,
    "eventAt" TIMESTAMP(3),
    "eventAtText" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actorsJson" TEXT NOT NULL DEFAULT '[]',
    "exhibitIdsJson" TEXT NOT NULL DEFAULT '[]',
    "anchorIdsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChronologyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "WorkspacePreference_workspaceId_idx" ON "WorkspacePreference"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspacePreference_workspaceId_key_key" ON "WorkspacePreference"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "WorkspaceSecret_workspaceId_idx" ON "WorkspaceSecret"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceSecret_workspaceId_provider_key" ON "WorkspaceSecret"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "OidcState_expiresAt_idx" ON "OidcState"("expiresAt");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE INDEX "Matter_workspaceId_idx" ON "Matter"("workspaceId");

-- CreateIndex
CREATE INDEX "Matter_id_workspaceId_idx" ON "Matter"("id", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Matter_workspaceId_slug_key" ON "Matter"("workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibit_storageKey_key" ON "Exhibit"("storageKey");

-- CreateIndex
CREATE INDEX "Exhibit_workspaceId_idx" ON "Exhibit"("workspaceId");

-- CreateIndex
CREATE INDEX "Exhibit_id_workspaceId_idx" ON "Exhibit"("id", "workspaceId");

-- CreateIndex
CREATE INDEX "Exhibit_matterId_idx" ON "Exhibit"("matterId");

-- CreateIndex
CREATE INDEX "Exhibit_verificationStatus_idx" ON "Exhibit"("verificationStatus");

-- CreateIndex
CREATE INDEX "Exhibit_batesNumber_idx" ON "Exhibit"("batesNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibit_matterId_batesNumber_key" ON "Exhibit"("matterId", "batesNumber");

-- CreateIndex
CREATE INDEX "Anchor_exhibitId_pageNumber_idx" ON "Anchor"("exhibitId", "pageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Anchor_exhibitId_pageNumber_lineNumber_key" ON "Anchor"("exhibitId", "pageNumber", "lineNumber");

-- CreateIndex
CREATE INDEX "DocumentChunk_workspaceId_idx" ON "DocumentChunk"("workspaceId");

-- CreateIndex
CREATE INDEX "DocumentChunk_matterId_idx" ON "DocumentChunk"("matterId");

-- CreateIndex
CREATE INDEX "DocumentChunk_exhibitId_idx" ON "DocumentChunk"("exhibitId");

-- CreateIndex
CREATE INDEX "DocumentChunk_workspaceId_matterId_idx" ON "DocumentChunk"("workspaceId", "matterId");

-- CreateIndex
CREATE INDEX "AuditEvent_workspaceId_createdAt_idx" ON "AuditEvent"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_workspaceId_prevHash_key" ON "AuditEvent"("workspaceId", "prevHash");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "SystemAudit_workspaceId_createdAt_idx" ON "SystemAudit"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLedgerProof_workspaceId_createdAt_idx" ON "AuditLedgerProof"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "BatesReservation_workspaceId_createdAt_idx" ON "BatesReservation"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "BatesReservation_workspaceId_prefix_number_idx" ON "BatesReservation"("workspaceId", "prefix", "number");

-- CreateIndex
CREATE UNIQUE INDEX "BatesReservation_prefix_number_key" ON "BatesReservation"("prefix", "number");

-- CreateIndex
CREATE INDEX "InferenceState_workspaceId_userId_exhibitId_idx" ON "InferenceState"("workspaceId", "userId", "exhibitId");

-- CreateIndex
CREATE INDEX "InferenceState_workspaceId_updatedAt_idx" ON "InferenceState"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "Playbook_workspaceId_idx" ON "Playbook"("workspaceId");

-- CreateIndex
CREATE INDEX "Clause_workspaceId_idx" ON "Clause"("workspaceId");

-- CreateIndex
CREATE INDEX "Clause_matterId_idx" ON "Clause"("matterId");

-- CreateIndex
CREATE INDEX "Clause_workspaceId_clauseType_idx" ON "Clause"("workspaceId", "clauseType");

-- CreateIndex
CREATE UNIQUE INDEX "Clause_workspaceId_exhibitId_clauseType_sourceChunkId_key" ON "Clause"("workspaceId", "exhibitId", "clauseType", "sourceChunkId");

-- CreateIndex
CREATE INDEX "RiskAssessment_workspaceId_idx" ON "RiskAssessment"("workspaceId");

-- CreateIndex
CREATE INDEX "RiskAssessment_clauseId_idx" ON "RiskAssessment"("clauseId");

-- CreateIndex
CREATE INDEX "RiskAssessment_playbookId_idx" ON "RiskAssessment"("playbookId");

-- CreateIndex
CREATE INDEX "Deadline_workspaceId_idx" ON "Deadline"("workspaceId");

-- CreateIndex
CREATE INDEX "Deadline_matterId_idx" ON "Deadline"("matterId");

-- CreateIndex
CREATE INDEX "Deadline_exhibitId_idx" ON "Deadline"("exhibitId");

-- CreateIndex
CREATE INDEX "Deadline_sourceChunkId_idx" ON "Deadline"("sourceChunkId");

-- CreateIndex
CREATE INDEX "Deadline_status_idx" ON "Deadline"("status");

-- CreateIndex
CREATE INDEX "Deadline_dueDate_idx" ON "Deadline"("dueDate");

-- CreateIndex
CREATE INDEX "Integration_workspaceId_idx" ON "Integration"("workspaceId");

-- CreateIndex
CREATE INDEX "Integration_type_idx" ON "Integration"("type");

-- CreateIndex
CREATE INDEX "ExternalResource_workspaceId_idx" ON "ExternalResource"("workspaceId");

-- CreateIndex
CREATE INDEX "ExternalResource_exhibitId_idx" ON "ExternalResource"("exhibitId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalResource_integrationId_externalId_key" ON "ExternalResource"("integrationId", "externalId");

-- CreateIndex
CREATE INDEX "IntegrityAlert_workspaceId_resolved_idx" ON "IntegrityAlert"("workspaceId", "resolved");

-- CreateIndex
CREATE INDEX "IntegrityAlert_workspaceId_createdAt_idx" ON "IntegrityAlert"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrityAlert_workspaceId_exhibitId_resolved_deletedAt_idx" ON "IntegrityAlert"("workspaceId", "exhibitId", "resolved", "deletedAt");

-- CreateIndex
CREATE INDEX "Tombstone_exhibitId_idx" ON "Tombstone"("exhibitId");

-- CreateIndex
CREATE INDEX "ChronologyRun_workspaceId_createdAt_idx" ON "ChronologyRun"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ChronologyRun_workspaceId_matterId_createdAt_idx" ON "ChronologyRun"("workspaceId", "matterId", "createdAt");

-- CreateIndex
CREATE INDEX "ChronologyEvent_workspaceId_matterId_idx" ON "ChronologyEvent"("workspaceId", "matterId");

-- CreateIndex
CREATE INDEX "ChronologyEvent_runId_idx" ON "ChronologyEvent"("runId");

-- CreateIndex
CREATE INDEX "ChronologyEvent_eventAt_idx" ON "ChronologyEvent"("eventAt");

-- AddForeignKey
ALTER TABLE "WorkspacePreference" ADD CONSTRAINT "WorkspacePreference_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceSecret" ADD CONSTRAINT "WorkspaceSecret_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matter" ADD CONSTRAINT "Matter_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibit" ADD CONSTRAINT "Exhibit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exhibit" ADD CONSTRAINT "Exhibit_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anchor" ADD CONSTRAINT "Anchor_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemAudit" ADD CONSTRAINT "SystemAudit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLedgerProof" ADD CONSTRAINT "AuditLedgerProof_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatesReservation" ADD CONSTRAINT "BatesReservation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatesReservation" ADD CONSTRAINT "BatesReservation_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatesReservation" ADD CONSTRAINT "BatesReservation_reservedBy_fkey" FOREIGN KEY ("reservedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InferenceState" ADD CONSTRAINT "InferenceState_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InferenceState" ADD CONSTRAINT "InferenceState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InferenceState" ADD CONSTRAINT "InferenceState_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clause" ADD CONSTRAINT "Clause_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clause" ADD CONSTRAINT "Clause_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clause" ADD CONSTRAINT "Clause_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clause" ADD CONSTRAINT "Clause_sourceChunkId_fkey" FOREIGN KEY ("sourceChunkId") REFERENCES "DocumentChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "Clause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_sourceChunkId_fkey" FOREIGN KEY ("sourceChunkId") REFERENCES "DocumentChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalResource" ADD CONSTRAINT "ExternalResource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalResource" ADD CONSTRAINT "ExternalResource_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalResource" ADD CONSTRAINT "ExternalResource_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityAlert" ADD CONSTRAINT "IntegrityAlert_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrityAlert" ADD CONSTRAINT "IntegrityAlert_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChronologyRun" ADD CONSTRAINT "ChronologyRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChronologyRun" ADD CONSTRAINT "ChronologyRun_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChronologyRun" ADD CONSTRAINT "ChronologyRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChronologyEvent" ADD CONSTRAINT "ChronologyEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ChronologyRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChronologyEvent" ADD CONSTRAINT "ChronologyEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChronologyEvent" ADD CONSTRAINT "ChronologyEvent_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
