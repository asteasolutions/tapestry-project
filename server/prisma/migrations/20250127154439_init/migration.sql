-- CreateEnum
CREATE TYPE "ItemType" AS ENUM (
  'text',
  'audio',
  'video',
  'book',
  'image',
  'pdf',
  'waybackPage',
  'webpage'
);

-- CreateEnum
CREATE TYPE "RelArrowhead" AS ENUM ('none', 'arrow');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tapestry" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "backgroundIndex" INTEGER NOT NULL,
  "parentId" TEXT,
  CONSTRAINT "Tapestry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tapestryId" TEXT NOT NULL,
  "positionX" INTEGER NOT NULL,
  "positionY" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "type" "ItemType" NOT NULL,
  "title" TEXT,
  "dropShadow" BOOLEAN NOT NULL,
  "text" TEXT,
  "backgroundColor" TEXT,
  "source" TEXT,
  "timestamp" TEXT,
  CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rel" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tapestryId" TEXT NOT NULL,
  "fromItemId" TEXT NOT NULL,
  "fromAnchorX" DOUBLE PRECISION NOT NULL,
  "fromAnchorY" DOUBLE PRECISION NOT NULL,
  "fromArrowhead" "RelArrowhead" NOT NULL DEFAULT 'none',
  "toItemId" TEXT NOT NULL,
  "toAnchorX" DOUBLE PRECISION NOT NULL,
  "toAnchorY" DOUBLE PRECISION NOT NULL,
  "toArrowhead" "RelArrowhead" NOT NULL DEFAULT 'arrow',
  "color" TEXT NOT NULL,
  CONSTRAINT "Rel_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE
  "Tapestry"
ADD
  CONSTRAINT "Tapestry_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Tapestry"
ADD
  CONSTRAINT "Tapestry_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Tapestry"("id") ON DELETE
SET
  NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Item"
ADD
  CONSTRAINT "Item_tapestryId_fkey" FOREIGN KEY ("tapestryId") REFERENCES "Tapestry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Rel"
ADD
  CONSTRAINT "Rel_tapestryId_fkey" FOREIGN KEY ("tapestryId") REFERENCES "Tapestry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Rel"
ADD
  CONSTRAINT "Rel_fromItemId_fkey" FOREIGN KEY ("fromItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Rel"
ADD
  CONSTRAINT "Rel_toItemId_fkey" FOREIGN KEY ("toItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;