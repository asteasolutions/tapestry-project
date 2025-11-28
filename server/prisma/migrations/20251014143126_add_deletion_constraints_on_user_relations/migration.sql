-- DropForeignKey
ALTER TABLE
  "TapestryCreateJob" DROP CONSTRAINT "TapestryCreateJob_userId_fkey";

-- DropForeignKey
ALTER TABLE
  "UserSecret" DROP CONSTRAINT "UserSecret_ownerId_fkey";

-- AddForeignKey
ALTER TABLE
  "TapestryCreateJob"
ADD
  CONSTRAINT "TapestryCreateJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE
  "UserSecret"
ADD
  CONSTRAINT "UserSecret_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;