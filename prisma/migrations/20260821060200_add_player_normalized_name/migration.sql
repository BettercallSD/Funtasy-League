-- AlterTable
-- Added nullable first: 1328 existing rows need normalizedName backfilled by
-- the app (lib/normalize-name.ts does Unicode-aware diacritic stripping,
-- which isn't reliable to replicate in raw SQL) before a follow-up migration
-- can set this NOT NULL.
ALTER TABLE "Player" ADD COLUMN     "normalizedName" TEXT;

-- CreateIndex
CREATE INDEX "Player_normalizedName_idx" ON "Player"("normalizedName");
