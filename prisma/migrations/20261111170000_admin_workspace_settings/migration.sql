CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "workspaceName" TEXT NOT NULL DEFAULT 'The AI Rankers',
    "defaultTimezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "defaultReportingWindow" TEXT NOT NULL DEFAULT '6m',
    "portalVisibility" TEXT NOT NULL DEFAULT 'published',
    "brandingMode" TEXT NOT NULL DEFAULT 'default',
    "notifyClientFeedback" BOOLEAN NOT NULL DEFAULT true,
    "notifyReportPublishing" BOOLEAN NOT NULL DEFAULT true,
    "notifySyncWarnings" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);
