/*
 Warnings:
 
 - You are about to drop the column `publishedAt` on the `Tapestry` table. All the data in the column will be lost.
 
 */
-- CreateEnum
CREATE TYPE "TapestryVisibility" AS ENUM ('private', 'link', 'public');

-- AlterTable
ALTER TABLE
  "Tapestry" DROP COLUMN "publishedAt",
ADD
  COLUMN "visibility" "TapestryVisibility" NOT NULL DEFAULT 'private';