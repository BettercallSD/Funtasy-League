// Sum of the three UEFA competition slot counts — this is the "top-bracket"
// N referenced by CLAUDE.md's scoring table (any of these positions, any
// order, +10 each). Kept as one helper so the scoring engine (Phase 5) and
// admin validation never compute this differently.
export function getTotalEuropeanSlots(season: {
  championsLeagueSlots: number;
  europaLeagueSlots: number;
  conferenceLeagueSlots: number;
}): number {
  return season.championsLeagueSlots + season.europaLeagueSlots + season.conferenceLeagueSlots;
}
