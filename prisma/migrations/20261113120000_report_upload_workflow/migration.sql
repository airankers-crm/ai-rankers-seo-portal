-- Add the report delivery lifecycle and metadata needed for secure PDF uploads.
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'SENT', 'FAILED');

ALTER TABLE "Report"
  ADD COLUMN "originalFileName" TEXT,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "sizeBytes" INTEGER,
  ADD COLUMN "status" "ReportStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "sentAt" TIMESTAMP(3);

CREATE INDEX "Report_clientId_status_updatedAt_idx" ON "Report"("clientId", "status", "updatedAt");
