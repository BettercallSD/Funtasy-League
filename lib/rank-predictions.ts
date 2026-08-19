// CLAUDE.md: "Tie-breaker for any leaderboard: whoever has the most '+5
// exact position' bonuses wins the tie. If still tied, they're shown tied —
// no further tiebreak." Standard competition ranking: tied entries share a
// rank, and the next distinct entry resumes at its true position (1, 1, 3).
export interface RankableEntry {
  score: number;
  exactBonusCount: number;
}

export function computeRanks<T extends RankableEntry>(entries: T[]): (T & { rank: number })[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.exactBonusCount - a.exactBonusCount;
  });

  const ranked: (T & { rank: number })[] = [];
  let previousRank = 0;
  let previous: T | null = null;

  sorted.forEach((entry, index) => {
    const isTiedWithPrevious =
      previous !== null &&
      entry.score === previous.score &&
      entry.exactBonusCount === previous.exactBonusCount;
    const rank = isTiedWithPrevious ? previousRank : index + 1;
    ranked.push({ ...entry, rank });
    previousRank = rank;
    previous = entry;
  });

  return ranked;
}
