/*
  Warnings:

  - A unique constraint covering the columns `[wikimediaId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "wikimediaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_wikimediaId_key" ON "User"("wikimediaId");
