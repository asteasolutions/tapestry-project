-- AlterEnum
ALTER TYPE "ItemType" ADD VALUE 'iiif';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN "imageService" TEXT;
