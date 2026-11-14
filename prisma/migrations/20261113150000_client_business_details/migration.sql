ALTER TABLE "Client" ADD COLUMN "businessPhone" TEXT;
ALTER TABLE "Client" ADD COLUMN "serviceArea" TEXT;
ALTER TABLE "Client" ADD COLUMN "businessHours" TEXT;

UPDATE "Client"
SET "businessPhone" = '+1 (917) 295-0672',
    "serviceArea" = 'Jamaica, NY',
    "businessHours" = 'Mon–Fri, 8:00 AM–6:00 PM'
WHERE "slug" = 'mckoy-hvac-refrigeration-services';
