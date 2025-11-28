-- CreateEnum
CREATE TYPE "LineWeight" AS ENUM ('light', 'medium', 'heavy');

-- AlterTable
ALTER TABLE
  "Rel"
ADD
  COLUMN "weight" "LineWeight" NOT NULL DEFAULT 'light';
