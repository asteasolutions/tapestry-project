/*
  Warnings:

  - You are about to drop the column `backgroundIndex` on the `Tapestry` table. All the data in the column will be lost.
  - Added the required column `background` to the `Tapestry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `theme` to the `Tapestry` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UITheme" AS ENUM ('light', 'dark');

-- AlterTable
ALTER TABLE "Tapestry" DROP COLUMN "backgroundIndex",
ADD COLUMN     "background" TEXT NOT NULL,
ADD COLUMN     "startViewHeight" INTEGER,
ADD COLUMN     "startViewWidth" INTEGER,
ADD COLUMN     "startViewX" INTEGER,
ADD COLUMN     "startViewY" INTEGER,
ADD COLUMN     "theme" "UITheme" NOT NULL;
