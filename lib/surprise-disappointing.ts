import { prisma } from "@/lib/prisma";

export interface TeamPredictionStats {
  averagePredictedPosition: number;
  sampleSize: number;
}

// Average predicted position per team across all locked, non-guest
// predictions for the season — the community-expectation half of CLAUDE.md's
// Surprise/Disappointing Team rule. Exposed per-team (not just the winner)
// so the finalize action can show "Community expected Xth, finished Yth" for
// whichever team ends up chosen, whether picked by the algorithm below or by
// an admin override.
export async function getAveragePredictedPositions(
  seasonId: string,
): Promise<Map<string, TeamPredictionStats>> {
  const entries = await prisma.predictionTableEntry.findMany({
    where: { prediction: { seasonId, isGuest: false, lockedAt: { not: null } } },
    select: { teamId: true, predictedPosition: true },
  });

  const sums = new Map<string, { sum: number; count: number }>();
  for (const entry of entries) {
    const bucket = sums.get(entry.teamId) ?? { sum: 0, count: 0 };
    bucket.sum += entry.predictedPosition;
    bucket.count += 1;
    sums.set(entry.teamId, bucket);
  }

  const result = new Map<string, TeamPredictionStats>();
  for (const [teamId, { sum, count }] of sums) {
    result.set(teamId, { averagePredictedPosition: sum / count, sampleSize: count });
  }
  return result;
}

// The team that most outperformed the community's average expectation is
// Surprise Team; the team that most underperformed it is Disappointing Team.
export function pickSurpriseAndDisappointingTeam(
  averageByTeamId: Map<string, TeamPredictionStats>,
  actualPositionByTeamId: Map<string, number>,
): { surpriseTeamId: string | null; disappointingTeamId: string | null } {
  let bestSurprise: { teamId: string; delta: number } | null = null;
  let worstDisappointing: { teamId: string; delta: number } | null = null;

  for (const [teamId, { averagePredictedPosition }] of averageByTeamId) {
    const actual = actualPositionByTeamId.get(teamId);
    if (actual === undefined) continue;
    // Positive delta = finished better than expected (lower position number
    // is better); negative = finished worse.
    const delta = averagePredictedPosition - actual;

    if (delta > 0 && (bestSurprise === null || delta > bestSurprise.delta)) {
      bestSurprise = { teamId, delta };
    }
    if (delta < 0 && (worstDisappointing === null || delta < worstDisappointing.delta)) {
      worstDisappointing = { teamId, delta };
    }
  }

  return {
    surpriseTeamId: bestSurprise?.teamId ?? null,
    disappointingTeamId: worstDisappointing?.teamId ?? null,
  };
}
