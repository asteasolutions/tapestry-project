-- Rename column
ALTER TABLE "Item" 
RENAME COLUMN "skipSeconds" TO "startTime";

-- AlterTable
ALTER TABLE "Item"
ADD COLUMN    "stopTime" INTEGER;
