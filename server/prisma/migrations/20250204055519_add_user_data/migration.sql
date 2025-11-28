-- AlterTable
ALTER TABLE
  "User"
ADD
  COLUMN "avatar" TEXT,
ADD
  COLUMN "email" TEXT NOT NULL,
ADD
  COLUMN "familyName" TEXT NOT NULL,
ADD
  COLUMN "givenName" TEXT NOT NULL,
ADD
  COLUMN "gsiUserId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_gsiUserId_key" ON "User"("gsiUserId");