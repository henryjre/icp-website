-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('PROJECT', 'ELEMENT');

-- AlterEnum
ALTER TYPE "DocumentCategory" ADD VALUE 'PROJECT_GENERAL';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "scope" "DocumentScope" NOT NULL DEFAULT 'ELEMENT';
ALTER TABLE "Document" ALTER COLUMN "elementId" DROP NOT NULL;

-- Backfill existing docs as element-scoped
UPDATE "Document" SET "scope" = 'ELEMENT'::"DocumentScope";

-- CreateIndex
CREATE INDEX "Document_scope_idx" ON "Document"("scope");
CREATE INDEX "Document_projectId_scope_idx" ON "Document"("projectId", "scope");
