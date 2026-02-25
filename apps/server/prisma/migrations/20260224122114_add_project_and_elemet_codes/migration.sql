/*
  Warnings:

  - A unique constraint covering the columns `[seq]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectCode]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "projectCode" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "seq" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_seq_key" ON "public"."Project"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "public"."Project"("projectCode");
