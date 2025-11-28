-- CreateEnum
CREATE TYPE "AiChatMessageAttachmentType" AS ENUM ('item');

-- CreateTable
CREATE TABLE "AiChatMessageAttachment" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "messageId" TEXT NOT NULL,
  "type" "AiChatMessageAttachmentType" NOT NULL,
  "itemId" TEXT,
  CONSTRAINT "AiChatMessageAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE
  "AiChatMessageAttachment"
ADD
  CONSTRAINT "AiChatMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AiChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "AiChatMessageAttachment"
ADD
  CONSTRAINT "AiChatMessageAttachment_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE
SET
  NULL ON UPDATE CASCADE;