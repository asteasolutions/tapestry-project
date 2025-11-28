-- AlterTable
ALTER TABLE
  "User"
ADD
  COLUMN "username" TEXT;

-- Set username to be the first part of the email
UPDATE
  "User"
SET
  "username" = substring(
    "email"
    FROM
      '(.*)@'
  );

-- Disambiguate duplicates by adding a number at the end
UPDATE
  "User"
SET
  "username" = concat(t.username, t.rn - 1)
FROM
  (
    SELECT
      "id",
      "username",
      "createdAt",
      ROW_NUMBER(*) OVER (
        PARTITION BY "username"
        ORDER BY
          "createdAt"
      ) AS rn
    FROM
      "User"
  ) "t"
WHERE
  "t"."id" = "User"."id"
  AND "t"."rn" > 1;

-- Make the column not null
ALTER TABLE
  "User"
ALTER COLUMN
  "username"
SET
  NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");