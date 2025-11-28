-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- AlterTable
ALTER TABLE
  "Tapestry"
ALTER COLUMN
  "title"
SET
  DATA TYPE CITEXT;