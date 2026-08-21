// Pure scoring function implementing CLAUDE.md's scoring table exactly.
// Shared by both final scoring (against admin-entered SeasonResult) and
// projected scoring (against the live SeasonSnapshot) — "projected" just
// means the ground truth passed in is today's standings instead of the
// final ones, treated identically by the math.

export interface ScoringConfig {
  teamCount: number;
  /** championsLeagueSlots + europaLeagueSlots + conferenceLeagueSlots */
  topBracketSize: number;
  /** directRelegationCount + playoffRelegationCount */
  relegationSize: number;
}

export interface AwardPicks {
  goldenBootPlayerId: string | null;
  mostAssistsPlayerId: string | null;
  youngPlayerPlayerId: string | null;
  emergingPlayerPlayerId: string | null;
  surpriseTeamId: string | null;
  disappointingTeamId: string | null;
}

export interface TableAndAwards extends AwardPicks {
  /** teamId -> final position, 1..teamCount, a complete permutation */
  positionByTeamId: Map<string, number>;
}

export interface ScoreBreakdown {
  championPoints: number;
  topBracketPoints: number;
  exactPositionBonusPoints: number;
  exactPositionBonusCount: number;
  relegationPoints: number;
  goldenBootPoints: number;
  mostAssistsPoints: number;
  youngPlayerPoints: number;
  emergingPlayerPoints: number;
  /** Hot takes, not scored — tracked so accuracy stats and recap pages can
   * still show whether the pick was right, per CLAUDE.md's "scrap the
   * points but keep the categories" rule. */
  surpriseTeamCorrect: boolean;
  disappointingTeamCorrect: boolean;
  total: number;
}

function topNTeamIds(positionByTeamId: Map<string, number>, n: number): Set<string> {
  const ids = new Set<string>();
  for (const [teamId, position] of positionByTeamId) {
    if (position <= n) ids.add(teamId);
  }
  return ids;
}

function bottomNTeamIds(
  positionByTeamId: Map<string, number>,
  teamCount: number,
  n: number,
): Set<string> {
  const threshold = teamCount - n;
  const ids = new Set<string>();
  for (const [teamId, position] of positionByTeamId) {
    if (position > threshold) ids.add(teamId);
  }
  return ids;
}

function teamAtPosition(positionByTeamId: Map<string, number>, position: number): string | null {
  for (const [teamId, teamPosition] of positionByTeamId) {
    if (teamPosition === position) return teamId;
  }
  return null;
}

export function scorePrediction(
  config: ScoringConfig,
  truth: TableAndAwards,
  prediction: TableAndAwards,
): ScoreBreakdown {
  const truthChampion = teamAtPosition(truth.positionByTeamId, 1);
  const predictedChampion = teamAtPosition(prediction.positionByTeamId, 1);
  const championPoints = truthChampion !== null && truthChampion === predictedChampion ? 25 : 0;

  const truthTopBracket = topNTeamIds(truth.positionByTeamId, config.topBracketSize);
  const predictionTopBracket = topNTeamIds(prediction.positionByTeamId, config.topBracketSize);
  const topBracketHits = [...truthTopBracket].filter((teamId) =>
    predictionTopBracket.has(teamId),
  ).length;
  const topBracketPoints = topBracketHits * 10;

  const truthRelegated = bottomNTeamIds(
    truth.positionByTeamId,
    config.teamCount,
    config.relegationSize,
  );
  const predictionRelegated = bottomNTeamIds(
    prediction.positionByTeamId,
    config.teamCount,
    config.relegationSize,
  );
  const relegationHits = [...truthRelegated].filter((teamId) =>
    predictionRelegated.has(teamId),
  ).length;
  const relegationPoints = relegationHits * 10;

  let exactPositionBonusCount = 0;
  for (const [teamId, truthPosition] of truth.positionByTeamId) {
    if (prediction.positionByTeamId.get(teamId) === truthPosition) {
      exactPositionBonusCount += 1;
    }
  }
  const exactPositionBonusPoints = exactPositionBonusCount * 5;

  const goldenBootPoints =
    truth.goldenBootPlayerId !== null && truth.goldenBootPlayerId === prediction.goldenBootPlayerId
      ? 20
      : 0;
  const mostAssistsPoints =
    truth.mostAssistsPlayerId !== null &&
    truth.mostAssistsPlayerId === prediction.mostAssistsPlayerId
      ? 20
      : 0;
  const youngPlayerPoints =
    truth.youngPlayerPlayerId !== null &&
    truth.youngPlayerPlayerId === prediction.youngPlayerPlayerId
      ? 15
      : 0;
  const emergingPlayerPoints =
    truth.emergingPlayerPlayerId !== null &&
    truth.emergingPlayerPlayerId === prediction.emergingPlayerPlayerId
      ? 25
      : 0;
  const surpriseTeamCorrect =
    truth.surpriseTeamId !== null && truth.surpriseTeamId === prediction.surpriseTeamId;
  const disappointingTeamCorrect =
    truth.disappointingTeamId !== null &&
    truth.disappointingTeamId === prediction.disappointingTeamId;

  const total =
    championPoints +
    topBracketPoints +
    exactPositionBonusPoints +
    relegationPoints +
    goldenBootPoints +
    mostAssistsPoints +
    youngPlayerPoints +
    emergingPlayerPoints;

  return {
    championPoints,
    topBracketPoints,
    exactPositionBonusPoints,
    exactPositionBonusCount,
    relegationPoints,
    goldenBootPoints,
    mostAssistsPoints,
    youngPlayerPoints,
    emergingPlayerPoints,
    surpriseTeamCorrect,
    disappointingTeamCorrect,
    total,
  };
}
