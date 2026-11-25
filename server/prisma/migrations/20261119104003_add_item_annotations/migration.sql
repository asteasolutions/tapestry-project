-- AlterEnum
ALTER TYPE "CommentContextType" ADD VALUE 'itemAnnotation';

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "itemAnnotationId" TEXT;

-- CreateTable
CREATE TABLE "ItemAnnotation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "isHighlight" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemAnnotation_itemId_idx" ON "ItemAnnotation"("itemId");

-- CreateIndex
CREATE INDEX "ItemAnnotation_authorId_idx" ON "ItemAnnotation"("authorId");

-- CreateIndex
CREATE INDEX "Comment_itemAnnotationId_idx" ON "Comment"("itemAnnotationId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_itemAnnotationId_fkey" FOREIGN KEY ("itemAnnotationId") REFERENCES "ItemAnnotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAnnotation" ADD CONSTRAINT "ItemAnnotation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemAnnotation" ADD CONSTRAINT "ItemAnnotation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
