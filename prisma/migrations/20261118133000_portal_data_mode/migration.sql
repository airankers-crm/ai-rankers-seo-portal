-- Keep imported/admin-edited values and Google API values in the same tenant
-- database while allowing the portal to select one source set at a time.
CREATE TYPE "PortalDataMode" AS ENUM ('MANAGED', 'GOOGLE_API');

ALTER TABLE "Client"
  ADD COLUMN "dataMode" "PortalDataMode" NOT NULL DEFAULT 'MANAGED';

ALTER TABLE "MetricValue"
  ADD COLUMN "dataOrigin" "PortalDataMode" NOT NULL DEFAULT 'MANAGED';

DROP INDEX "MetricValue_metricId_periodStart_periodEnd_source_key";

CREATE UNIQUE INDEX "MetricValue_metricId_periodStart_periodEnd_source_dataOrigin_key"
  ON "MetricValue"("metricId", "periodStart", "periodEnd", "source", "dataOrigin");

CREATE INDEX "MetricValue_metricId_dataOrigin_periodStart_idx"
  ON "MetricValue"("metricId", "dataOrigin", "periodStart");
