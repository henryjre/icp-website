-- Add nullable identity fields so existing elements remain valid during deployment.
ALTER TABLE "public"."Element"
ADD COLUMN "batch" INTEGER,
ADD COLUMN "serialNumber" TEXT;

-- Batch and serial identify one element within a project. PostgreSQL permits
-- multiple legacy rows with NULL identity values under this unique index.
CREATE UNIQUE INDEX "Element_projectId_batch_serialNumber_key"
ON "public"."Element"("projectId", "batch", "serialNumber");
