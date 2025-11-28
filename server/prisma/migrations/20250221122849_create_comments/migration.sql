-- CreateEnum
CREATE TYPE "CommentContextType" AS ENUM ('tapestry', 'item', 'rel', 'comment');

-- CreateTable
CREATE TABLE "Comment" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "text" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "contextType" "CommentContextType" NOT NULL,
  "tapestryId" TEXT,
  "itemId" TEXT,
  "relId" TEXT,
  "parentCommentId" TEXT,
  CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE
  "Comment"
ADD
  CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Comment"
ADD
  CONSTRAINT "Comment_tapestryId_fkey" FOREIGN KEY ("tapestryId") REFERENCES "Tapestry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Comment"
ADD
  CONSTRAINT "Comment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Comment"
ADD
  CONSTRAINT "Comment_relId_fkey" FOREIGN KEY ("relId") REFERENCES "Rel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "Comment"
ADD
  CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;