/*
  Warnings:

  - Added the required column `firstSeen` to the `TapestryInteraction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE 
  "TapestryInteraction" 
ADD COLUMN     
  "firstSeen" 
TIMESTAMP(3);

UPDATE 
  "TapestryInteraction"
SET 
  "firstSeen" = "createdAt";

ALTER TABLE 
  "TapestryInteraction" 
ALTER COLUMN   
  "firstSeen"
SET 
  NOT NULL;