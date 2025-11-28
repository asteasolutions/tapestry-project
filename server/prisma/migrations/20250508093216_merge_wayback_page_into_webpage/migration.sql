-- CreateEnum
CREATE TYPE "WebpageType" AS ENUM (
  'youtube',
  'vimeo',
  'iaWayback',
  'iaAudio',
  'iaVideo'
);

-- AlterTable
ALTER TABLE
  "Item" DROP COLUMN "thumbnailTimestamp",
ADD
  COLUMN "webpageType" "WebpageType";

-- Update data
UPDATE
  "Item"
SET
  "type" = 'webpage',
  "webpageType" = 'iaWayback'
WHERE
  "type" = 'waybackPage';

UPDATE
  "Item"
SET
  "webpageType" = 'youtube'
WHERE
  "source" ILIKE 'http%youtube.com/%'
  OR "source" ILIKE 'http%youtu.be/%';

UPDATE
  "Item"
SET
  "webpageType" = 'vimeo'
WHERE
  "source" ILIKE 'http%vimeo.com/%';

-- AlterEnum
BEGIN;

CREATE TYPE "ItemType_new" AS ENUM (
  'text',
  'audio',
  'video',
  'book',
  'image',
  'pdf',
  'webpage'
);

ALTER TABLE
  "Item"
ALTER COLUMN
  "type" TYPE "ItemType_new" USING ("type" :: text :: "ItemType_new");

ALTER TYPE "ItemType" RENAME TO "ItemType_old";

ALTER TYPE "ItemType_new" RENAME TO "ItemType";

DROP TYPE "ItemType_old";

COMMIT;