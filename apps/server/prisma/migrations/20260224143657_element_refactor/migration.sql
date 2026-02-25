/*
  Warnings:

  - You are about to drop the column `concreteGrade` on the `Element` table. All the data in the column will be lost.
  - You are about to drop the column `dimensions` on the `Element` table. All the data in the column will be lost.
  - You are about to drop the column `markNumber` on the `Element` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Element` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Element` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Element_projectId_markNumber_key";

-- AlterTable
ALTER TABLE "public"."Element" DROP COLUMN "concreteGrade",
DROP COLUMN "dimensions",
DROP COLUMN "markNumber",
DROP COLUMN "type",
DROP COLUMN "weight";
