// Strips diacritics and lowercases so search matches regardless of accents —
// e.g. "mbappe" finds "Mbappé". Player.normalizedName is precomputed with
// this at write time (sync-players.ts, seed.ts) so search queries can filter
// with Prisma's query builder instead of a raw-SQL unaccent() call.
export function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
