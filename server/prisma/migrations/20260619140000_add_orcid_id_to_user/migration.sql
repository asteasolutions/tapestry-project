-- AlterTable
ALTER TABLE "User" ADD COLUMN "orcidId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_orcidId_key" ON "User"("orcidId");
