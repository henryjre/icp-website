-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('admin', 'editor', 'client');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('Completed', 'Ongoing');

-- CreateEnum
CREATE TYPE "public"."ElementStatus" AS ENUM ('Casted', 'Delivered');

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('created', 'updated', 'status', 'document', 'comment', 'delivered');

-- CreateEnum
CREATE TYPE "public"."DocumentCategory" AS ENUM ('TEST_RESULT', 'PLAN');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('PDF', 'DOCX', 'XLSX', 'DWG', 'DXF', 'OTHER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "dateStarted" TIMESTAMP(3) NOT NULL,
    "status" "public"."ProjectStatus" NOT NULL,
    "completionDate" TIMESTAMP(3),
    "thumbnail" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "contractValue" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Element" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "markNumber" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" "public"."ElementStatus" NOT NULL,
    "castingDate" TIMESTAMP(3) NOT NULL,
    "dimensions" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "concreteGrade" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Element_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "elementId" TEXT NOT NULL,
    "category" "public"."DocumentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "docType" "public"."DocumentType" NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "elementId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "public"."ActivityType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "public"."RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "public"."RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "Element_projectId_idx" ON "public"."Element"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Element_projectId_markNumber_key" ON "public"."Element"("projectId", "markNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Document_s3Key_key" ON "public"."Document"("s3Key");

-- CreateIndex
CREATE INDEX "Document_elementId_idx" ON "public"."Document"("elementId");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "public"."Document"("projectId");

-- CreateIndex
CREATE INDEX "Activity_projectId_idx" ON "public"."Activity"("projectId");

-- CreateIndex
CREATE INDEX "Activity_elementId_idx" ON "public"."Activity"("elementId");

-- CreateIndex
CREATE INDEX "Activity_actorId_idx" ON "public"."Activity"("actorId");

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Element" ADD CONSTRAINT "Element_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Element" ADD CONSTRAINT "Element_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "public"."Element"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "public"."Element"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

