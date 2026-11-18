-- Track which client users have seen each published report so the portal can show unread report notifications.
CREATE TABLE "ReportRead" (
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportRead_pkey" PRIMARY KEY ("reportId", "userId")
);

CREATE INDEX "ReportRead_userId_seenAt_idx" ON "ReportRead"("userId", "seenAt");

ALTER TABLE "ReportRead" ADD CONSTRAINT "ReportRead_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportRead" ADD CONSTRAINT "ReportRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
