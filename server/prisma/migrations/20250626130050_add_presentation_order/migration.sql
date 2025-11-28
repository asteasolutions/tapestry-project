-- CreateTable
CREATE TABLE "PresentationStep" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "itemId" TEXT NOT NULL,
  "prevStepId" TEXT,
  CONSTRAINT "PresentationStep_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE
  "PresentationStep"
ADD
  CONSTRAINT "PresentationStep_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "PresentationStep"
ADD
  CONSTRAINT "PresentationStep_prevStepId_fkey" FOREIGN KEY ("prevStepId") REFERENCES "PresentationStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;