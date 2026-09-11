-- AlterEnum
ALTER TYPE "CommentContextType" ADD VALUE 'annotation';

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "annotationId" TEXT;

-- CreateTable
CREATE TABLE "ItemAnnotation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,
    "elementId" TEXT,
    "itemId" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ItemAnnotation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "ItemAnnotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAnnotation" ADD CONSTRAINT "ItemAnnotation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAnnotation" ADD CONSTRAINT "ItemAnnotation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
