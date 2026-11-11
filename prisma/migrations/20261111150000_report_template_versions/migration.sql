CREATE TYPE "ReportTemplateVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "ReportTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "ReportTemplateVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportTemplateVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportTemplateAssignment" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReportTemplateAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportTemplate_key_key" ON "ReportTemplate"("key");
CREATE UNIQUE INDEX "ReportTemplateVersion_templateId_version_key" ON "ReportTemplateVersion"("templateId", "version");
CREATE INDEX "ReportTemplateVersion_templateId_status_idx" ON "ReportTemplateVersion"("templateId", "status");
CREATE UNIQUE INDEX "ReportTemplateAssignment_clientId_service_key" ON "ReportTemplateAssignment"("clientId", "service");
CREATE INDEX "ReportTemplateAssignment_versionId_idx" ON "ReportTemplateAssignment"("versionId");

ALTER TABLE "ReportTemplateVersion" ADD CONSTRAINT "ReportTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportTemplateAssignment" ADD CONSTRAINT "ReportTemplateAssignment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportTemplateAssignment" ADD CONSTRAINT "ReportTemplateAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReportTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportTemplateAssignment" ADD CONSTRAINT "ReportTemplateAssignment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ReportTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
