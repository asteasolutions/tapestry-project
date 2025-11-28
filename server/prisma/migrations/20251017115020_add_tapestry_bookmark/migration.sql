-- CreateTable
CREATE TABLE "TapestryBookmark" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "tapestryId" TEXT NOT NULL,

    CONSTRAINT "TapestryBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TapestryBookmark_userId_tapestryId_key" ON "TapestryBookmark"("userId", "tapestryId");

-- AddForeignKey
ALTER TABLE "TapestryBookmark" ADD CONSTRAINT "TapestryBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TapestryBookmark" ADD CONSTRAINT "TapestryBookmark_tapestryId_fkey" FOREIGN KEY ("tapestryId") REFERENCES "Tapestry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
