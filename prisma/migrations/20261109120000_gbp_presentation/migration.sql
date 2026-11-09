CREATE TABLE "GbpPresentation" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL DEFAULT 'Google Business Profile',
    "pageSubtitle" TEXT NOT NULL DEFAULT 'Performance from Google Search and Maps.',
    "filterLabel" TEXT NOT NULL DEFAULT 'Filter report',
    "channelLabel" TEXT NOT NULL DEFAULT 'Search + Maps',
    "displayLabel" TEXT NOT NULL DEFAULT 'Monthly',
    "chartTitle" TEXT NOT NULL DEFAULT 'Profile views over time',
    "insightTitle" TEXT NOT NULL DEFAULT 'Key insights',
    "insightOne" TEXT NOT NULL DEFAULT 'Calls increased {{callsChange}} compared with the previous period.',
    "insightTwo" TEXT NOT NULL DEFAULT 'Website clicks are {{websiteTrend}}.',
    "insightSource" TEXT NOT NULL DEFAULT 'Data is sourced from Google Search and Maps.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GbpPresentation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GbpPresentation_sectionId_key" ON "GbpPresentation"("sectionId");

ALTER TABLE "GbpPresentation" ADD CONSTRAINT "GbpPresentation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
