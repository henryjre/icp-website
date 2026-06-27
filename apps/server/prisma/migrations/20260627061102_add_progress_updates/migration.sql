-- CreateTable
CREATE TABLE "public"."ProgressUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProgressImage" (
    "id" TEXT NOT NULL,
    "progressUpdateId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgressUpdate_elementId_idx" ON "public"."ProgressUpdate"("elementId");

-- CreateIndex
CREATE INDEX "ProgressUpdate_projectId_idx" ON "public"."ProgressUpdate"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressImage_s3Key_key" ON "public"."ProgressImage"("s3Key");

-- CreateIndex
CREATE INDEX "ProgressImage_progressUpdateId_idx" ON "public"."ProgressImage"("progressUpdateId");

-- AddForeignKey
ALTER TABLE "public"."ProgressUpdate" ADD CONSTRAINT "ProgressUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressUpdate" ADD CONSTRAINT "ProgressUpdate_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "public"."Element"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressUpdate" ADD CONSTRAINT "ProgressUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProgressImage" ADD CONSTRAINT "ProgressImage_progressUpdateId_fkey" FOREIGN KEY ("progressUpdateId") REFERENCES "public"."ProgressUpdate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
