/*
 * Delete broken comments that don't have a valid context relation.
 * At this point we don't have any replies, so comments with contextType = 'comment' are also considered broken.
 */
DELETE FROM
  "Comment"
WHERE
  "tapestryId" IS NULL
  AND "itemId" IS NULL
  AND "relId" IS NULL;

UPDATE
  "Comment"
SET
  "tapestryId" = "Item"."tapestryId"
FROM
  "Item"
WHERE
  "Comment"."tapestryId" IS NULL
  AND "Comment"."contextType" = 'item'
  AND "Comment"."itemId" = "Item"."id";

UPDATE
  "Comment"
SET
  "tapestryId" = "Rel"."tapestryId"
FROM
  "Rel"
WHERE
  "Comment"."tapestryId" IS NULL
  AND "Comment"."contextType" = 'rel'
  AND "Comment"."relId" = "Rel"."id";

-- AlterTable
ALTER TABLE
  "Comment"
ALTER COLUMN
  "tapestryId"
SET
  NOT NULL;