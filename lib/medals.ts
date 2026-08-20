// Medals only, no named bragging-rights tiers — CLAUDE.md originally
// specified 🥇 Football Professor / 🥈 Decent Ball Knowledge / 🥉 Needs to
// Watch More Football / "You Don't Know Ball", simplified per user request
// to just the top-3 medal icons with no tier copy for everyone else.
export function getMedalEmoji(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}
