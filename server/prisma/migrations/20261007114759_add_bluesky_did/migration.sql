/*
  Warnings:

  - A unique constraint covering the columns `[blueskyDid]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blueskyDid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_blueskyDid_key" ON "User"("blueskyDid");
