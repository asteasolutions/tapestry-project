-- CreateTable
CREATE TABLE "TapestryInteraction" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "tapestryId" TEXT NOT NULL,
  "lastSeen" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TapestryInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TapestryInteraction_userId_tapestryId_key" ON "TapestryInteraction"("userId", "tapestryId");

-- AddForeignKey
ALTER TABLE
  "TapestryInteraction"
ADD
  CONSTRAINT "TapestryInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "TapestryInteraction"
ADD
  CONSTRAINT "TapestryInteraction_tapestryId_fkey" FOREIGN KEY ("tapestryId") REFERENCES "Tapestry"("id") ON DELETE CASCADE ON UPDATE CASCADE;