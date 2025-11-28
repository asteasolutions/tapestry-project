-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('google');

-- CreateEnum
CREATE TYPE "AiChatParticipantRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "AiChatMessageState" AS ENUM ('pending', 'processed', 'error');

-- CreateTable
CREATE TABLE "AiChat" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "aiProvider" "AiProvider" NOT NULL,
  "aiModel" TEXT NOT NULL,
  "tapestryId" TEXT,
  CONSTRAINT "AiChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "chatId" TEXT NOT NULL,
  "role" "AiChatParticipantRole" NOT NULL,
  "content" TEXT NOT NULL,
  "state" "AiChatMessageState" NOT NULL,
  CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE
  "AiChat"
ADD
  CONSTRAINT "AiChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "AiChat"
ADD
  CONSTRAINT "AiChat_tapestryId_fkey" FOREIGN KEY ("tapestryId") REFERENCES "Tapestry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "AiChatMessage"
ADD
  CONSTRAINT "AiChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "AiChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;