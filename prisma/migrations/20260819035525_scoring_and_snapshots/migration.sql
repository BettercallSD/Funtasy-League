-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "finalExactBonusCount" INTEGER,
ADD COLUMN     "finalScore" INTEGER,
ADD COLUMN     "finalScoreBreakdown" JSONB,
ADD COLUMN     "projectedExactBonusCount" INTEGER,
ADD COLUMN     "projectedScore" INTEGER,
ADD COLUMN     "projectedScoreBreakdown" JSONB,
ADD COLUMN     "projectedScoreUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SeasonSnapshot" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "standings" JSONB NOT NULL,
    "topScorerId" TEXT,

    CONSTRAINT "SeasonSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonSnapshot_seasonId_key" ON "SeasonSnapshot"("seasonId");

-- AddForeignKey
ALTER TABLE "SeasonSnapshot" ADD CONSTRAINT "SeasonSnapshot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonSnapshot" ADD CONSTRAINT "SeasonSnapshot_topScorerId_fkey" FOREIGN KEY ("topScorerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
