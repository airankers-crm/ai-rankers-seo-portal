CREATE TYPE "FeedbackCategory" AS ENUM ('ISSUE', 'QUESTION', 'REQUEST', 'PRAISE');

CREATE TYPE "FeedbackStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED');

CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "FeedbackCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "pageLabel" TEXT NOT NULL,
    "context" JSONB,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Feedback_clientId_status_createdAt_idx" ON "Feedback"("clientId", "status", "createdAt");

CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");

ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
