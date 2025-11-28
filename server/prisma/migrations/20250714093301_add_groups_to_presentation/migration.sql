-- AlterTable
ALTER TABLE
  "PresentationStep"
ADD
  COLUMN "groupId" TEXT,
ALTER COLUMN
  "itemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE
  "PresentationStep"
ADD
  CONSTRAINT "PresentationStep_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;