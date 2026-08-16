/*
  Warnings:

  - You are about to drop the column `europeanQualificationSlots` on the `Season` table. All the data in the column will be lost.
  - Added the required column `championsLeagueSlots` to the `Season` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conferenceLeagueSlots` to the `Season` table without a default value. This is not possible if the table is not empty.
  - Added the required column `europaLeagueSlots` to the `Season` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Season" DROP COLUMN "europeanQualificationSlots",
ADD COLUMN     "championsLeagueSlots" INTEGER NOT NULL,
ADD COLUMN     "conferenceLeagueSlots" INTEGER NOT NULL,
ADD COLUMN     "europaLeagueSlots" INTEGER NOT NULL;
