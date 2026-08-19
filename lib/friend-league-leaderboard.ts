import { prisma } from "@/lib/prisma";

export interface FriendLeagueSeasonScore {
  seasonId: string;
  leagueName: string;
  year: number;
  score: number;
  exactBonusCount: number;
  isFinal: boolean;
}

export interface FriendLeagueMemberScore {
  userId: string;
  userName: string;
  totalScore: number;
  totalExactBonusCount: number;
  perSeason: FriendLeagueSeasonScore[];
}

// Sums each member's score across exactly the season(s) the friend league is
// scoped to — no averaging, no cross-scope comparison (CLAUDE.md). Uses the
// final score once a season's finalized, otherwise the current projected
// score, so the leaderboard stays live for seasons still in progress.
export async function getFriendLeagueScores(
  friendLeagueId: string,
): Promise<FriendLeagueMemberScore[]> {
  const friendLeague = await prisma.friendLeague.findUnique({
    where: { id: friendLeagueId },
    include: {
      members: { include: { user: true } },
      seasons: { include: { season: { include: { league: true } } } },
    },
  });
  if (!friendLeague) return [];

  const seasonIds = friendLeague.seasons.map((friendLeagueSeason) => friendLeagueSeason.seasonId);
  const memberUserIds = friendLeague.members.map((member) => member.userId);

  const predictions = await prisma.prediction.findMany({
    where: {
      seasonId: { in: seasonIds },
      isGuest: false,
      lockedAt: { not: null },
      userId: { in: memberUserIds },
    },
  });

  const predictionByUserSeason = new Map<string, (typeof predictions)[number]>();
  for (const prediction of predictions) {
    if (prediction.userId) {
      predictionByUserSeason.set(`${prediction.userId}:${prediction.seasonId}`, prediction);
    }
  }

  return friendLeague.members.map((member) => {
    let totalScore = 0;
    let totalExactBonusCount = 0;

    const perSeason: FriendLeagueSeasonScore[] = friendLeague.seasons.map((friendLeagueSeason) => {
      const prediction = predictionByUserSeason.get(
        `${member.userId}:${friendLeagueSeason.seasonId}`,
      );
      const isFinal = prediction?.finalScore != null;
      const score = isFinal ? (prediction?.finalScore ?? 0) : (prediction?.projectedScore ?? 0);
      const exactBonusCount = isFinal
        ? (prediction?.finalExactBonusCount ?? 0)
        : (prediction?.projectedExactBonusCount ?? 0);

      totalScore += score;
      totalExactBonusCount += exactBonusCount;

      return {
        seasonId: friendLeagueSeason.seasonId,
        leagueName: friendLeagueSeason.season.league.name,
        year: friendLeagueSeason.season.year,
        score,
        exactBonusCount,
        isFinal,
      };
    });

    return {
      userId: member.userId,
      userName: member.user.name ?? "Anonymous",
      totalScore,
      totalExactBonusCount,
      perSeason,
    };
  });
}
