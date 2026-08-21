// Shown right where users make their picks so the scoring rules aren't a
// mystery — CLAUDE.md's scoring table, rendered with this season's actual
// top-bracket/relegation counts instead of generic placeholders.
export function PointsExplainer({
  topBracketSize,
  relegationSize,
}: {
  topBracketSize: number;
  relegationSize: number;
}) {
  const rows: Array<{ label: string; points: string }> = [
    { label: "Champion correct", points: "25" },
    { label: `Top-bracket team (any order, top ${topBracketSize})`, points: "10 each" },
    { label: "Exact league position (any team, stacks with the above)", points: "+5" },
    { label: `Relegated team (any order, bottom ${relegationSize})`, points: "10 each" },
    { label: "Golden Boot", points: "20" },
    { label: "Most Assists", points: "20" },
    { label: "Young Player of the Season (U23)", points: "15" },
    { label: "Player of the Season", points: "25" },
    { label: "Surprise Team / Disappointing Team", points: "hot take, no points" },
  ];

  return (
    <details className="border-bk-border bg-bk-surface group rounded-lg border">
      <summary className="font-display text-bk-text flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
        How scoring works
        <span className="text-bk-text-secondary text-xs transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="border-bk-border overflow-x-auto border-t px-4 py-3">
        <table className="w-full min-w-[360px] text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-bk-border/60 border-t first:border-t-0">
                <td className="text-bk-text-secondary py-1.5 pr-3">{row.label}</td>
                <td className="text-bk-text py-1.5 text-right font-semibold whitespace-nowrap">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-bk-text-secondary mt-3 text-xs">
          Tie-breaker: whoever has the most exact-position bonuses wins. Still tied? You&apos;re
          shown tied.
        </p>
      </div>
    </details>
  );
}
