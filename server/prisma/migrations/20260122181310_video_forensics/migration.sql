-- CreateEnum
CREATE TYPE "ExhibitType" AS ENUM ('PDF', 'VIDEO', 'AUDIO');

-- AlterTable
ALTER TABLE "Exhibit" ADD COLUMN     "mediaMetadataJson" TEXT,
ADD COLUMN     "type" "ExhibitType" NOT NULL DEFAULT 'PDF';

-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "speaker" TEXT,
    "embedding" vector NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFrame" (
    "id" TEXT NOT NULL,
    "exhibitId" TEXT NOT NULL,
    "timestamp" DOUBLE PRECISION NOT NULL,
    "frameHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFrame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranscriptSegment_exhibitId_idx" ON "TranscriptSegment"("exhibitId");

-- CreateIndex
CREATE INDEX "TranscriptSegment_startTime_idx" ON "TranscriptSegment"("startTime");

-- CreateIndex
CREATE INDEX "MediaFrame_exhibitId_idx" ON "MediaFrame"("exhibitId");

-- CreateIndex
CREATE INDEX "MediaFrame_timestamp_idx" ON "MediaFrame"("timestamp");

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFrame" ADD CONSTRAINT "MediaFrame_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
