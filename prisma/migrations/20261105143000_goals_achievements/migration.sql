-- CreateEnum
CREATE TYPE "GoalCondition" AS ENUM ('GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'EQUALS');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "metricId" TEXT,
    "createdById" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "condition" "GoalCondition" NOT NULL DEFAULT 'GREATER_THAN_OR_EQUAL',
    "target" DECIMAL(18,4) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalAnnotation" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "happenedAt" TIMESTAMP(3) NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_clientId_status_endDate_idx" ON "Goal"("clientId", "status", "endDate");
CREATE INDEX "Goal_metricId_idx" ON "Goal"("metricId");
CREATE INDEX "GoalAnnotation_goalId_happenedAt_idx" ON "GoalAnnotation"("goalId", "happenedAt");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "Metric"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GoalAnnotation" ADD CONSTRAINT "GoalAnnotation_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalAnnotation" ADD CONSTRAINT "GoalAnnotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
