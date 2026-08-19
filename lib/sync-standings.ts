import { prisma } from "@/lib/prisma";
import { fetchStandings, fetchTopScorer, delay, COMPETITION_CODES } from "@/lib/football-data-api";
import { scorePrediction, type ScoringConfig, type TableAndAwards } from "@/lib/scoring";
import { AwardCategory } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { LeagueSlug } from "@/lib/leagues";

export interface SyncResult {
  leagueSlug: string;
  status: "ok" | "skipped" | "error";
  message?: string;
}

function isSupportedLeagueSlug(slug: string): slug is LeagueSlug {
  return slug in COMPETITION_CODES;
}

// External team names never match our admin-entered names exactly (e.g.
// "Manchester City FC" vs "Manchester City") — strip suffixes/punctuation
// and compare, falling back to substring containment. Unmatched teams are
// simply left out of the snapshot; the scoring engine degrades gracefully
// rather than requiring a complete permutation.
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fc|cf|afc|ac)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function matchTeamByName(
  externalName: string,
  candidateTeams: { id: string; name: string }[],
): string | null {
  const normalizedExternal = normalizeTeamName(externalName);
  for (const team of candidateTeams) {
    if (normalizeTeamName(team.name) === normalizedExternal) return team.id;
  }
  for (const team of candidateTeams) {
    const normalizedTeam = normalizeTeamName(team.name);
    if (
      normalizedTeam.length > 0 &&
      (normalizedTeam.includes(normalizedExternal) || normalizedExternal.includes(normalizedTeam))
    ) {
      return team.id;
    }
  }
  return null;
}

// Pulls current standings + top scorer for every non-finalized season,
// stores a snapshot, and recomputes every locked non-guest prediction's
// projected score against it. One league's failure (rate limit, API error,
// no mapping) is caught and recorded — it never aborts the others.
export async function syncAllActiveSeasons(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  const seasons = await prisma.season.findMany({
    where: { status: { not: "FINALIZED" } },
    include: { league: true, seasonTeams: { include: { team: true } } },
  });

  for (const season of seasons) {
    const leagueSlug = season.league.slug;
    if (!isSupportedLeagueSlug(leagueSlug)) {
      results.push({ leagueSlug, status: "skipped", message: "no competition code mapping" });
      continue;
    }

    try {
      const standingsRows = await fetchStandings(leagueSlug);
      await delay(6500); // stay under football-data.org's 10 req/min free-tier limit
      const topScorer = await fetchTopScorer(leagueSlug);
      await delay(6500);

      const candidateTeams = season.seasonTeams.map((seasonTeam) => ({
        id: seasonTeam.teamId,
        name: seasonTeam.team.name,
      }));

      const standings: { teamId: string; position: number }[] = [];
      for (const row of standingsRows) {
        const teamId = matchTeamByName(row.teamExternalName, candidateTeams);
        if (teamId) standings.push({ teamId, position: row.position });
      }

      let topScorerId: string | null = null;
      if (topScorer) {
        const player = await prisma.player.findFirst({
          where: { name: { equals: topScorer.playerName, mode: "insensitive" } },
        });
        topScorerId = player?.id ?? null;
      }

      await prisma.seasonSnapshot.upsert({
        where: { seasonId: season.id },
        update: {
          standings: standings as unknown as Prisma.InputJsonValue,
          topScorerId,
          fetchedAt: new Date(),
        },
        create: {
          seasonId: season.id,
          standings: standings as unknown as Prisma.InputJsonValue,
          topScorerId,
        },
      });

      const scoringConfig: ScoringConfig = {
        teamCount: season.teamCount,
        topBracketSize:
          season.championsLeagueSlots + season.europaLeagueSlots + season.conferenceLeagueSlots,
        relegationSize: season.directRelegationCount + season.playoffRelegationCount,
      };
      // Only Golden Boot has a reliable free-tier live source — the rest
      // stay unscored (0 points) in the projected view until the admin
      // actually finalizes the season with real award winners.
      const truth: TableAndAwards = {
        positionByTeamId: new Map(standings.map((row) => [row.teamId, row.position])),
        goldenBootPlayerId: topScorerId,
        mostAssistsPlayerId: null,
        youngPlayerPlayerId: null,
        emergingPlayerPlayerId: null,
        surpriseTeamId: null,
        disappointingTeamId: null,
      };

      const predictions = await prisma.prediction.findMany({
        where: { seasonId: season.id, isGuest: false, lockedAt: { not: null } },
        include: { tableEntries: true, awards: true },
      });

      for (const prediction of predictions) {
        const awardsByCategory = new Map(prediction.awards.map((award) => [award.category, award]));
        const predictionInput: TableAndAwards = {
          positionByTeamId: new Map(
            prediction.tableEntries.map((entry) => [entry.teamId, entry.predictedPosition]),
          ),
          goldenBootPlayerId: awardsByCategory.get(AwardCategory.GOLDEN_BOOT)?.playerId ?? null,
          mostAssistsPlayerId: null,
          youngPlayerPlayerId: null,
          emergingPlayerPlayerId: null,
          surpriseTeamId: null,
          disappointingTeamId: null,
        };

        const breakdown = scorePrediction(scoringConfig, truth, predictionInput);

        await prisma.prediction.update({
          where: { id: prediction.id },
          data: {
            projectedScore: breakdown.total,
            projectedScoreBreakdown: breakdown as unknown as Prisma.InputJsonValue,
            projectedExactBonusCount: breakdown.exactPositionBonusCount,
            projectedScoreUpdatedAt: new Date(),
          },
        });
      }

      results.push({ leagueSlug, status: "ok" });
    } catch (error) {
      results.push({
        leagueSlug,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
