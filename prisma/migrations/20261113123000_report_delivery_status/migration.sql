-- Keep publication state independent from client delivery state.
CREATE TYPE "ReportDeliveryStatus" AS ENUM ('NOT_SENT', 'SENT', 'FAILED');

ALTER TABLE "Report"
  ADD COLUMN "deliveryStatus" "ReportDeliveryStatus" NOT NULL DEFAULT 'NOT_SENT';

CREATE INDEX "Report_clientId_deliveryStatus_updatedAt_idx" ON "Report"("clientId", "deliveryStatus", "updatedAt");
