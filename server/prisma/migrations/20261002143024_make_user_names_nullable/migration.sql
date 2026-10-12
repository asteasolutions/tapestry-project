-- AlterTable
ALTER TABLE "User" ALTER COLUMN "familyName" DROP NOT NULL,
ALTER COLUMN "givenName" DROP NOT NULL;

UPDATE "User" SET "givenName" = NULL WHERE "givenName" = '';
UPDATE "User" SET "familyName" = NULL WHERE "familyName" = '';