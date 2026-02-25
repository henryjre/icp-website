-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Pending', 'Active', 'Rejected', 'Archived');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('Active', 'Archived', 'Expired');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'Pending';
ALTER TABLE "User" ADD COLUMN "rejectedReason" TEXT;
ALTER TABLE "User" ALTER COLUMN "role" DROP NOT NULL;

UPDATE "User"
SET "fullName" = COALESCE(NULLIF(split_part("email", '@', 1), ''), 'User');

UPDATE "User"
SET "status" = CASE
  WHEN "isActive" = true THEN 'Active'::"UserStatus"
  ELSE 'Archived'::"UserStatus"
END;

ALTER TABLE "User" ALTER COLUMN "fullName" SET NOT NULL;

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'Active',
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "archivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteUse" (
    "id" TEXT NOT NULL,
    "inviteCodeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "InviteUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");
CREATE INDEX "InviteCode_status_idx" ON "InviteCode"("status");
CREATE INDEX "InviteCode_expiresAt_idx" ON "InviteCode"("expiresAt");
CREATE INDEX "InviteUse_inviteCodeId_idx" ON "InviteUse"("inviteCodeId");
CREATE INDEX "InviteUse_email_idx" ON "InviteUse"("email");

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_inviteCodeId_fkey" FOREIGN KEY ("inviteCodeId") REFERENCES "InviteCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
