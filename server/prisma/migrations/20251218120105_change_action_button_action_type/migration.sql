BEGIN;

ALTER TABLE
  "Item"
ALTER COLUMN
  "actionType" TYPE TEXT;

DROP TYPE "public"."ActionType";

UPDATE
  "Item"
SET
  "actionType" = 'internalLink',
  "action" = split_part("action", '?', 2)
FROM
  "Tapestry"
  JOIN "User" ON "Tapestry"."ownerId" = "User"."id"
WHERE
  "Item"."tapestryId" = "Tapestry"."id"
  AND "Item"."type" = 'actionButton'
  AND "Item"."actionType" = 'link'
  AND "Item"."action" ILIKE ANY(
    ARRAY [
      '%/t/' || "Tapestry"."id" || '%',
      '%/u/' || "User"."username" || '/' || "Tapestry"."slug" || '%'
    ]
  );

UPDATE
  "Item"
SET
  "actionType" = 'externalLink'
WHERE
  "type" = 'actionButton'
  AND "actionType" = 'link';

CREATE TYPE "ActionType" AS ENUM ('internalLink', 'externalLink');

ALTER TABLE
  "Item"
ALTER COLUMN
  "actionType" TYPE "ActionType" USING ("actionType" :: "ActionType");

COMMIT;