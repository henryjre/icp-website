-- Add indexes used by paginated and filtered project element lists.
CREATE INDEX "Element_projectId_createdAt_idx"
ON "public"."Element"("projectId", "createdAt");

CREATE INDEX "Element_projectId_batch_idx"
ON "public"."Element"("projectId", "batch");

CREATE INDEX "Element_projectId_status_idx"
ON "public"."Element"("projectId", "status");

CREATE INDEX "Element_projectId_batch_serialNumber_idx"
ON "public"."Element"("projectId", "batch", "serialNumber");
