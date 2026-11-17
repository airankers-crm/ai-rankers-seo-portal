CREATE UNIQUE INDEX "GoogleIntegration_id_clientId_key" ON "GoogleIntegration"("id", "clientId");

ALTER TABLE "IntegrationSyncRun" DROP CONSTRAINT "IntegrationSyncRun_integrationId_fkey";

ALTER TABLE "IntegrationSyncRun"
ADD CONSTRAINT "IntegrationSyncRun_integrationId_clientId_fkey"
FOREIGN KEY ("integrationId", "clientId") REFERENCES "GoogleIntegration"("id", "clientId") ON DELETE CASCADE ON UPDATE CASCADE;
