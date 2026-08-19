// Season has no explicit matchday schedule in the schema, so this
// approximates "how far into the season" from predictionLockAt (which is
// itself set to roughly kickoff) — one label bump per week since lock.
// Good enough for the guest result card; not used for anything scored.
export function computeSubmittedLabel(
  season: { predictionLockAt: Date },
  at: Date = new Date(),
): string {
  if (at < season.predictionLockAt) {
    return "Predicted preseason";
  }
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceLock =
    Math.floor((at.getTime() - season.predictionLockAt.getTime()) / msPerWeek) + 1;
  return `Predicted after GW${weeksSinceLock}`;
}
