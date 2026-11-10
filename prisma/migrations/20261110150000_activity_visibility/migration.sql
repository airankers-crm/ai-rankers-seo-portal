ALTER TABLE "Activity" ADD COLUMN "clientVisible" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Activity_clientId_clientVisible_createdAt_idx" ON "Activity"("clientId", "clientVisible", "createdAt");
