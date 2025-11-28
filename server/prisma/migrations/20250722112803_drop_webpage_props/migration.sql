-- Youtube
UPDATE
  "Item"
SET
  "source" = TRIM(
    trailing '?&'
    from
      CONCAT(
        "source",
        '?',
        'start=' || "startTime" || '&',
        'end=' || "stopTime"
      )
  ),
  "startTime" = NULL,
  "stopTime" = NULL
WHERE
  "webpageType" = 'youtube';

-- Vimeo
UPDATE
  "Item"
SET
  "source" = TRIM(
    trailing '#&'
    from
      CONCAT(
        "source",
        '#',
        't=' || ("startTime" / 60) || 'm' || ("startTime" % 60) || 's' || '&',
        'end=' || ("stopTime" / 60) || 'm' || ("stopTime" % 60) || 's'
      )
  ),
  "startTime" = NULL,
  "stopTime" = NULL
WHERE
  "webpageType" = 'vimeo';

-- Internet Archive audio/video
UPDATE
  "Item"
SET
  "source" = CONCAT("source", '?start=' || "startTime"),
  "startTime" = NULL,
  "stopTime" = NULL
WHERE
  "webpageType" IN ('iaAudio', 'iaVideo');

-- Wayback Machine
UPDATE
  "Item"
SET
  "source" = CONCAT(
    'https://web.archive.org/web/',
    "timestamp" || 'if_/',
    "source"
  )
WHERE
  "webpageType" = 'iaWayback';

-- AlterTable
ALTER TABLE
  "Item" DROP COLUMN "timestamp";