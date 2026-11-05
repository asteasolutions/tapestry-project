-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "AdminAction" AS ENUM ('openTapestry', 'changeFeatured', 'reorderGallery', 'deleteTapestry', 'deleteItems', 'changeRole');

-- CreateEnum
CREATE TYPE "AdminActivityTargetType" AS ENUM ('tapestry', 'user', 'gallery');

-- AlterTable
ALTER TABLE "Tapestry" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featuredAt" TIMESTAMP(3),
ADD COLUMN     "galleryPosition" INTEGER;

-- Existing public tapestries become link-shared and featured (newest first in the Gallery)
UPDATE "Tapestry" t
SET "featured" = true,
    "featuredAt" = CURRENT_TIMESTAMP,
    "galleryPosition" = ranked.position,
    "visibility" = 'link'
FROM (
  SELECT "id", (ROW_NUMBER() OVER (ORDER BY "createdAt" DESC))::INTEGER - 1 AS position
  FROM "Tapestry"
  WHERE "visibility" = 'public'
) ranked
WHERE t."id" = ranked."id";

-- AlterEnum
BEGIN;
CREATE TYPE "TapestryVisibility_new" AS ENUM ('private', 'link');
ALTER TABLE "public"."Tapestry" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "Tapestry" ALTER COLUMN "visibility" TYPE "TapestryVisibility_new" USING ("visibility"::text::"TapestryVisibility_new");
ALTER TYPE "TapestryVisibility" RENAME TO "TapestryVisibility_old";
ALTER TYPE "TapestryVisibility_new" RENAME TO "TapestryVisibility";
DROP TYPE "public"."TapestryVisibility_old";
ALTER TABLE "Tapestry" ALTER COLUMN "visibility" SET DEFAULT 'private';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "AdminActivity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT,
    "adminUsername" TEXT NOT NULL,
    "action" "AdminAction" NOT NULL,
    "targetType" "AdminActivityTargetType" NOT NULL,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "details" JSONB,

    CONSTRAINT "AdminActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TapestryDeletion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tapestryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerId" TEXT,
    "ownerUsername" TEXT NOT NULL,
    "deletedById" TEXT,
    "byAdmin" BOOLEAN NOT NULL,

    CONSTRAINT "TapestryDeletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TapestryExport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tapestryId" TEXT,
    "userId" TEXT,

    CONSTRAINT "TapestryExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminActivity_createdAt_idx" ON "AdminActivity"("createdAt");

-- CreateIndex
CREATE INDEX "AdminActivity_adminId_idx" ON "AdminActivity"("adminId");

-- CreateIndex
CREATE INDEX "AdminActivity_action_idx" ON "AdminActivity"("action");

-- CreateIndex
CREATE INDEX "TapestryDeletion_createdAt_idx" ON "TapestryDeletion"("createdAt");

-- CreateIndex
CREATE INDEX "TapestryDeletion_ownerId_idx" ON "TapestryDeletion"("ownerId");

-- CreateIndex
CREATE INDEX "TapestryDeletion_deletedById_idx" ON "TapestryDeletion"("deletedById");

-- CreateIndex
CREATE INDEX "TapestryExport_createdAt_idx" ON "TapestryExport"("createdAt");

-- CreateIndex
CREATE INDEX "TapestryExport_tapestryId_idx" ON "TapestryExport"("tapestryId");

-- CreateIndex
CREATE INDEX "TapestryExport_userId_idx" ON "TapestryExport"("userId");

-- CreateIndex
CREATE INDEX "Tapestry_featured_galleryPosition_idx" ON "Tapestry"("featured", "galleryPosition");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "AdminActivity" ADD CONSTRAINT "AdminActivity_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TapestryDeletion" ADD CONSTRAINT "TapestryDeletion_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TapestryDeletion" ADD CONSTRAINT "TapestryDeletion_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TapestryExport" ADD CONSTRAINT "TapestryExport_tapestryId_fkey" FOREIGN KEY ("tapestryId") REFERENCES "Tapestry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TapestryExport" ADD CONSTRAINT "TapestryExport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

