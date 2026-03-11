-- CreateEnum
CREATE TYPE "ThumbnailProcessing" AS ENUM ('derive', 'recreate');

-- AlterTable
ALTER TABLE
  "Item"
ADD
  COLUMN "scheduledThumbnailProcessing" "ThumbnailProcessing";
