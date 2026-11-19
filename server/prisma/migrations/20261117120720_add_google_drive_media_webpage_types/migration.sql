-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WebpageType" ADD VALUE 'googleDriveVideo';
ALTER TYPE "WebpageType" ADD VALUE 'googleDriveAudio';
ALTER TYPE "WebpageType" ADD VALUE 'googleDriveImage';
ALTER TYPE "WebpageType" ADD VALUE 'googleDrivePdf';
ALTER TYPE "WebpageType" ADD VALUE 'googleDriveBook';
