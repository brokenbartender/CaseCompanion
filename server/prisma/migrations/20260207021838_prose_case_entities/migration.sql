CREATE TYPE "RiskSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'FATAL');
CREATE TYPE "PartyType" AS ENUM ('individual', 'business', 'state_entity');
CREATE TYPE "CaseCourtLevel" AS ENUM ('district', 'circuit', 'other');
CREATE TYPE "ProceduralDeadlineStatus" AS ENUM ('OPEN', 'COMPLETE', 'MISSED', 'WAIVED');
CREATE TYPE "CaseDocumentStatus" AS ENUM ('DRAFT', 'FINAL');
CREATE TYPE "SignatureStatus" AS ENUM ('MISSING', 'PENDING', 'SIGNED');
CREATE TYPE "ServiceOutcome" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');
CREATE TYPE "ExportPacketType" AS ENUM ('FILING', 'SERVICE', 'TRIAL_BINDER', 'CUSTOM');
CREATE TYPE "ExportPacketStatus" AS ENUM ('DRAFT', 'GENERATED', 'FAILED');

CREATE TABLE "Case" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "matterId" TEXT,
  "name" TEXT NOT NULL,
  "jurisdictionId" TEXT NOT NULL,
  "courtLevel" "CaseCourtLevel" NOT NULL DEFAULT 'district',
  "county" TEXT NOT NULL,
  "filingDate" TIMESTAMP(3),
  "serviceDate" TIMESTAMP(3),
  "answerDate" TIMESTAMP(3),
  "discoveryServedDate" TIMESTAMP(3),
  "motionServedDate" TIMESTAMP(3),
  "pretrialDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Party" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PartyType" NOT NULL,
  "contactJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourtProfile" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "courtName" TEXT NOT NULL,
  "judgeName" TEXT,
  "localRuleOverridesJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourtProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulingOrder" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "orderDate" TIMESTAMP(3) NOT NULL,
  "overridesJson" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulingOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProceduralDeadline" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "triggerDate" TIMESTAMP(3),
  "status" "ProceduralDeadlineStatus" NOT NULL DEFAULT 'OPEN',
  "severity" "RiskSeverity" NOT NULL DEFAULT 'INFO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProceduralDeadline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CaseDocument" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" "CaseDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "filed" BOOLEAN NOT NULL DEFAULT false,
  "served" BOOLEAN NOT NULL DEFAULT false,
  "signatureStatus" "SignatureStatus" NOT NULL DEFAULT 'MISSING',
  "storageKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceAttempt" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "attemptedAt" TIMESTAMP(3) NOT NULL,
  "address" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "outcome" "ServiceOutcome" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "proofStorageKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenceItem" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "exhibitId" TEXT,
  "hash" TEXT NOT NULL,
  "metadataJson" TEXT,
  "redactionStatus" "RedactionStatus" NOT NULL DEFAULT 'NONE',
  "anchorRefsJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EvidenceItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExportPacket" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "type" "ExportPacketType" NOT NULL,
  "status" "ExportPacketStatus" NOT NULL DEFAULT 'DRAFT',
  "manifestJson" TEXT,
  "storageKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExportPacket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskRule" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "severity" "RiskSeverity" NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Case_workspaceId_matterId_key" ON "Case"("workspaceId", "matterId");
CREATE INDEX "Case_workspaceId_idx" ON "Case"("workspaceId");
CREATE INDEX "Case_matterId_idx" ON "Case"("matterId");

CREATE INDEX "Party_caseId_idx" ON "Party"("caseId");
CREATE UNIQUE INDEX "CourtProfile_caseId_key" ON "CourtProfile"("caseId");
CREATE INDEX "SchedulingOrder_caseId_idx" ON "SchedulingOrder"("caseId");
CREATE UNIQUE INDEX "ProceduralDeadline_caseId_ruleId_key" ON "ProceduralDeadline"("caseId", "ruleId");
CREATE INDEX "ProceduralDeadline_caseId_idx" ON "ProceduralDeadline"("caseId");
CREATE INDEX "ProceduralDeadline_dueDate_idx" ON "ProceduralDeadline"("dueDate");
CREATE INDEX "CaseDocument_caseId_idx" ON "CaseDocument"("caseId");
CREATE INDEX "ServiceAttempt_caseId_idx" ON "ServiceAttempt"("caseId");
CREATE INDEX "EvidenceItem_caseId_idx" ON "EvidenceItem"("caseId");
CREATE INDEX "EvidenceItem_exhibitId_idx" ON "EvidenceItem"("exhibitId");
CREATE INDEX "ExportPacket_caseId_idx" ON "ExportPacket"("caseId");
CREATE INDEX "RiskRule_caseId_idx" ON "RiskRule"("caseId");
CREATE INDEX "RiskRule_severity_idx" ON "RiskRule"("severity");

ALTER TABLE "Case" ADD CONSTRAINT "Case_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Case" ADD CONSTRAINT "Case_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "Matter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Party" ADD CONSTRAINT "Party_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourtProfile" ADD CONSTRAINT "CourtProfile_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulingOrder" ADD CONSTRAINT "SchedulingOrder_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProceduralDeadline" ADD CONSTRAINT "ProceduralDeadline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceAttempt" ADD CONSTRAINT "ServiceAttempt_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenceItem" ADD CONSTRAINT "EvidenceItem_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExportPacket" ADD CONSTRAINT "ExportPacket_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskRule" ADD CONSTRAINT "RiskRule_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
