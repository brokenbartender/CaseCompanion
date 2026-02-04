-- CreateTable
CREATE TABLE "LlmAudit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT,
    "promptKey" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "payloadEnvelopeJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmAudit_workspaceId_createdAt_idx" ON "LlmAudit"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmAudit_userId_createdAt_idx" ON "LlmAudit"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmAudit_requestId_idx" ON "LlmAudit"("requestId");

-- AddForeignKey
ALTER TABLE "LlmAudit" ADD CONSTRAINT "LlmAudit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmAudit" ADD CONSTRAINT "LlmAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
