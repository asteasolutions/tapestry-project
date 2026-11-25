-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog" VERSION "1.0";

-- AlterEnum
BEGIN;
CREATE TYPE "public"."CommentContextType_new" AS ENUM ('tapestry', 'item', 'rel', 'comment');
ALTER TABLE "public"."Comment" ALTER COLUMN "contextType" TYPE "public"."CommentContextType_new" USING ("contextType"::text::"public"."CommentContextType_new");
ALTER TYPE "public"."CommentContextType" RENAME TO "CommentContextType_old";
ALTER TYPE "public"."CommentContextType_new" RENAME TO "CommentContextType";
DROP TYPE "CommentContextType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."Comment" DROP CONSTRAINT "Comment_itemAnnotationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ItemAnnotation" DROP CONSTRAINT "ItemAnnotation_itemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ItemAnnotation" DROP CONSTRAINT "ItemAnnotation_authorId_fkey";

-- DropIndex
DROP INDEX "public"."Comment_itemAnnotationId_idx";

-- AlterTable
ALTER TABLE "public"."Comment" DROP COLUMN "itemAnnotationId";

-- DropTable
DROP TABLE "public"."ItemAnnotation";

