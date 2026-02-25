/*
  Warnings:

  - A unique constraint covering the columns `[seq]` on the table `Element` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[shortToken]` on the table `Element` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Element" ADD COLUMN     "seq" SERIAL NOT NULL,
ADD COLUMN     "shortToken" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Element_seq_key" ON "public"."Element"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "Element_shortToken_key" ON "public"."Element"("shortToken");
