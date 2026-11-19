-- Remove database objects for features retired from the application:
-- team communication, lead intake, and versioned report templates.

DROP TABLE "ChatMessage";
DROP TABLE "ChatGroup";

DROP TABLE "ReportTemplateAssignment";
DROP TABLE "ReportTemplateVersion";
DROP TABLE "ReportTemplate";

DROP TABLE "Lead";

DROP TYPE "ReportTemplateVersionStatus";
DROP TYPE "LeadStatus";
