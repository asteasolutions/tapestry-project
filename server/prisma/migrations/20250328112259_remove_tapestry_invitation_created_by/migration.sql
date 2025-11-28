/*
  Warnings:

  - You are about to drop the column `createdById` on the `TapestryInvitation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TapestryInvitation" DROP CONSTRAINT "TapestryInvitation_createdById_fkey";

-- AlterTable
ALTER TABLE "TapestryInvitation" DROP COLUMN "createdById";
