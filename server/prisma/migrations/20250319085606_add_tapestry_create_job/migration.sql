-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'processing', 'complete', 'failed');

-- CreateEnum
CREATE TYPE "TapestryCreateJobType" AS ENUM ('import', 'fork');

-- CreateTable
CREATE TABLE "TapestryCreateJob" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL,
    "type" "TapestryCreateJobType" NOT NULL,
    "tapestryId" TEXT,
    "parentId" TEXT,
    "s3Key" TEXT,

    CONSTRAINT "TapestryCreateJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TapestryCreateJob_tapestryId_key" ON "TapestryCreateJob"("tapestryId");

-- AddForeignKey
ALTER TABLE "TapestryCreateJob" ADD CONSTRAINT "TapestryCreateJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TapestryCreateJob" ADD CONSTRAINT "TapestryCreateJob_tapestryId_fkey" FOREIGN KEY ("tapestryId") REFERENCES "Tapestry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
