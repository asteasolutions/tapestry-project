-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('link');

-- AlterEnum
ALTER TYPE "ItemType" ADD VALUE 'actionButton';

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "action" TEXT,
ADD COLUMN     "actionType" "ActionType";
