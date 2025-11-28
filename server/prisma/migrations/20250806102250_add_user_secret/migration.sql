-- CreateEnum
CREATE TYPE "UserSecretType" AS ENUM ('googleApiKey');

-- CreateTable
CREATE TABLE "UserSecret" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "type" "UserSecretType" NOT NULL,
  "maskedValue" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  CONSTRAINT "UserSecret_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE
  "UserSecret"
ADD
  CONSTRAINT "UserSecret_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;