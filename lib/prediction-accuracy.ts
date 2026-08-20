import type { ScoreBreakdown } from "@/lib/scoring";

export interface AccuracyStat {
  correct: number;
  total: number;
}

export interface AccuracyConfig {
  topBracketSize: number;
  relegationSize: number;
}

// Prisma reads Json columns back as unknown-shaped JsonValue — this is the
// one place that trusts finalScoreBreakdown/projectedScoreBreakdown to
// actually match ScoreBreakdown, since we're the only writer of that column.
export function parseScoreBreakdown(value: unknown): ScoreBreakdown | null {
  if (!value || typeof value !== "object") return null;
  const breakdown = value as Partial<ScoreBreakdown>;
  if (typeof breakdown.total !== "number") return null;
  return breakdown as ScoreBreakdown;
}

// Treats champion, each top-bracket team, each relegated team, and each of
// the 6 awards as one predictable "item" (hit or miss) — gives a natural
// "8/16 predictions correct" stat straight from data already stored on the
// Prediction row, no extra schema or recomputation needed.
export function computeAccuracy(breakdown: ScoreBreakdown, config: AccuracyConfig): AccuracyStat {
  const championHit = breakdown.championPoints > 0 ? 1 : 0;
  const topBracketHits = breakdown.topBracketPoints / 10;
  const relegationHits = breakdown.relegationPoints / 15;
  const goldenBootHit = breakdown.goldenBootPoints > 0 ? 1 : 0;
  const mostAssistsHit = breakdown.mostAssistsPoints > 0 ? 1 : 0;
  const youngPlayerHit = breakdown.youngPlayerPoints > 0 ? 1 : 0;
  const emergingPlayerHit = breakdown.emergingPlayerPoints > 0 ? 1 : 0;
  const surpriseTeamHit = breakdown.surpriseTeamPoints > 0 ? 1 : 0;
  const disappointingTeamHit = breakdown.disappointingTeamPoints > 0 ? 1 : 0;

  const correct =
    championHit +
    topBracketHits +
    relegationHits +
    goldenBootHit +
    mostAssistsHit +
    youngPlayerHit +
    emergingPlayerHit +
    surpriseTeamHit +
    disappointingTeamHit;

  const total = 1 + config.topBracketSize + config.relegationSize + 6;

  return { correct, total };
}
