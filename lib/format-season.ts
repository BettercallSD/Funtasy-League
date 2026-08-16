// Season.year stores only the starting calendar year (e.g. 2026) so it stays
// numerically sortable/comparable — European top-5 seasons always span two
// calendar years (Aug–May), so every display should show the full "2026/27"
// form instead of the bare start year.
export function formatSeasonYear(year: number): string {
  const endYearShort = (year + 1) % 100;
  return `${year}/${endYearShort.toString().padStart(2, "0")}`;
}
