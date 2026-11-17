CREATE TYPE "GoogleIntegrationStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'RECONNECT_REQUIRED', 'ERROR');
CREATE TYPE "IntegrationSyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELED');
CREATE TYPE "IntegrationSyncMode" AS ENUM ('INITIAL_BACKFILL', 'MANUAL', 'SCHEDULED');

CREATE TABLE "GoogleIntegration" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "GoogleIntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "googleAccountEmail" TEXT,
    "googleSubject" TEXT,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "ga4PropertyId" TEXT,
    "gscSiteUrl" TEXT,
    "gbpAccountId" TEXT,
    "gbpLocationId" TEXT,
    "encryptedRefreshToken" TEXT,
    "encryptedAccessToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "lastAttemptedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationSyncRun" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "mode" "IntegrationSyncMode" NOT NULL,
    "status" "IntegrationSyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "rowsFetched" INTEGER NOT NULL DEFAULT 0,
    "rowsWritten" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "rowsOverridden" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "errorDetails" JSONB,

    CONSTRAINT "IntegrationSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoogleOAuthState" (
    "id" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "returnPath" TEXT NOT NULL,
    "encryptedCodeVerifier" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleOAuthState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleIntegration_clientId_key" ON "GoogleIntegration"("clientId");
CREATE INDEX "GoogleIntegration_status_lastSyncedAt_idx" ON "GoogleIntegration"("status", "lastSyncedAt");
CREATE INDEX "IntegrationSyncRun_clientId_startedAt_idx" ON "IntegrationSyncRun"("clientId", "startedAt");
CREATE INDEX "IntegrationSyncRun_integrationId_startedAt_idx" ON "IntegrationSyncRun"("integrationId", "startedAt");
CREATE INDEX "IntegrationSyncRun_status_startedAt_idx" ON "IntegrationSyncRun"("status", "startedAt");
CREATE UNIQUE INDEX "GoogleOAuthState_stateHash_key" ON "GoogleOAuthState"("stateHash");
CREATE INDEX "GoogleOAuthState_clientId_expiresAt_idx" ON "GoogleOAuthState"("clientId", "expiresAt");
CREATE INDEX "GoogleOAuthState_userId_expiresAt_idx" ON "GoogleOAuthState"("userId", "expiresAt");

ALTER TABLE "GoogleIntegration" ADD CONSTRAINT "GoogleIntegration_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationSyncRun" ADD CONSTRAINT "IntegrationSyncRun_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "GoogleIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationSyncRun" ADD CONSTRAINT "IntegrationSyncRun_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleOAuthState" ADD CONSTRAINT "GoogleOAuthState_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoogleOAuthState" ADD CONSTRAINT "GoogleOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
