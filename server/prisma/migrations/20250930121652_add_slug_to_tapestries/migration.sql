-- AlterTable
ALTER TABLE
  "Tapestry"
ADD
  COLUMN "slug" TEXT;

UPDATE
  "Tapestry"
SET
  "slug" = "id";

ALTER TABLE
  "Tapestry"
ALTER COLUMN
  "slug"
SET
  NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tapestry_ownerId_slug_key" ON "Tapestry"("ownerId", "slug");