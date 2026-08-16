-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'OPEN', 'LOCKED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "AwardCategory" AS ENUM ('GOLDEN_BOOT', 'MOST_ASSISTS', 'YOUNG_PLAYER', 'SURPRISE_TEAM', 'DISAPPOINTING_TEAM', 'EMERGING_PLAYER');

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "teamCount" INTEGER NOT NULL,
    "directRelegationCount" INTEGER NOT NULL,
    "playoffRelegationCount" INTEGER NOT NULL,
    "europeanQualificationSlots" INTEGER NOT NULL,
    "predictionLockAt" TIMESTAMP(3) NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "crestUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonTeam" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "promoted" BOOLEAN NOT NULL DEFAULT false,
    "relegated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SeasonTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "position" TEXT,
    "currentTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "guestToken" TEXT,
    "claimedByUserId" TEXT,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "submittedLabel" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionTableEntry" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "predictedPosition" INTEGER NOT NULL,

    CONSTRAINT "PredictionTableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionAward" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "category" "AwardCategory" NOT NULL,
    "playerId" TEXT,
    "teamId" TEXT,

    CONSTRAINT "PredictionAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonResult" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "finalizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedByUserId" TEXT NOT NULL,

    CONSTRAINT "SeasonResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonResultTableEntry" (
    "id" TEXT NOT NULL,
    "seasonResultId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "finalPosition" INTEGER NOT NULL,

    CONSTRAINT "SeasonResultTableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonResultAward" (
    "id" TEXT NOT NULL,
    "seasonResultId" TEXT NOT NULL,
    "category" "AwardCategory" NOT NULL,
    "playerId" TEXT,
    "teamId" TEXT,
    "averagePredictedPosition" DOUBLE PRECISION,
    "actualPosition" INTEGER,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SeasonResultAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendLeague" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "maxMembers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendLeague_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendLeagueSeason" (
    "id" TEXT NOT NULL,
    "friendLeagueId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,

    CONSTRAINT "FriendLeagueSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendLeagueMember" (
    "id" TEXT NOT NULL,
    "friendLeagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendLeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Season_leagueId_year_key" ON "Season"("leagueId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonTeam_seasonId_teamId_key" ON "SeasonTeam"("seasonId", "teamId");

-- CreateIndex
CREATE INDEX "Player_name_idx" ON "Player"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_guestToken_key" ON "Prediction"("guestToken");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_claimedByUserId_key" ON "Prediction"("claimedByUserId");

-- CreateIndex
CREATE INDEX "Prediction_seasonId_isGuest_idx" ON "Prediction"("seasonId", "isGuest");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_seasonId_key" ON "Prediction"("userId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionTableEntry_predictionId_teamId_key" ON "PredictionTableEntry"("predictionId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionTableEntry_predictionId_predictedPosition_key" ON "PredictionTableEntry"("predictionId", "predictedPosition");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionAward_predictionId_category_key" ON "PredictionAward"("predictionId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonResult_seasonId_key" ON "SeasonResult"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonResultTableEntry_seasonResultId_teamId_key" ON "SeasonResultTableEntry"("seasonResultId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonResultTableEntry_seasonResultId_finalPosition_key" ON "SeasonResultTableEntry"("seasonResultId", "finalPosition");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonResultAward_seasonResultId_category_key" ON "SeasonResultAward"("seasonResultId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "FriendLeague_inviteCode_key" ON "FriendLeague"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "FriendLeagueSeason_friendLeagueId_seasonId_key" ON "FriendLeagueSeason"("friendLeagueId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendLeagueMember_friendLeagueId_userId_key" ON "FriendLeagueMember"("friendLeagueId", "userId");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonTeam" ADD CONSTRAINT "SeasonTeam_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonTeam" ADD CONSTRAINT "SeasonTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_currentTeamId_fkey" FOREIGN KEY ("currentTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionTableEntry" ADD CONSTRAINT "PredictionTableEntry_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionTableEntry" ADD CONSTRAINT "PredictionTableEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionAward" ADD CONSTRAINT "PredictionAward_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionAward" ADD CONSTRAINT "PredictionAward_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionAward" ADD CONSTRAINT "PredictionAward_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonResult" ADD CONSTRAINT "SeasonResult_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonResultTableEntry" ADD CONSTRAINT "SeasonResultTableEntry_seasonResultId_fkey" FOREIGN KEY ("seasonResultId") REFERENCES "SeasonResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonResultTableEntry" ADD CONSTRAINT "SeasonResultTableEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonResultAward" ADD CONSTRAINT "SeasonResultAward_seasonResultId_fkey" FOREIGN KEY ("seasonResultId") REFERENCES "SeasonResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonResultAward" ADD CONSTRAINT "SeasonResultAward_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonResultAward" ADD CONSTRAINT "SeasonResultAward_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendLeague" ADD CONSTRAINT "FriendLeague_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendLeagueSeason" ADD CONSTRAINT "FriendLeagueSeason_friendLeagueId_fkey" FOREIGN KEY ("friendLeagueId") REFERENCES "FriendLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendLeagueSeason" ADD CONSTRAINT "FriendLeagueSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendLeagueMember" ADD CONSTRAINT "FriendLeagueMember_friendLeagueId_fkey" FOREIGN KEY ("friendLeagueId") REFERENCES "FriendLeague"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendLeagueMember" ADD CONSTRAINT "FriendLeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
