ALTER TABLE "Client" ADD COLUMN "hasAnalytics" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Client" ALTER COLUMN "hasWebsiteSeo" SET DEFAULT true;
ALTER TABLE "Client" ALTER COLUMN "hasGbpSeo" SET DEFAULT true;

UPDATE "Client"
SET "hasWebsiteSeo" = true,
    "hasAnalytics" = true,
    "hasGbpSeo" = true;
