import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { formatSeasonYear } from "@/lib/format-season";
import { computeRanks } from "@/lib/rank-predictions";

export default async function LivePredictionLeaguePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const leagueConfig = getLeague(slug);
  if (!leagueConfig) notFound();
  const accent = LEAGUE_ACCENT_CLASSES[leagueConfig.slug];

  const season = await prisma.season.findFirst({
    where: { league: { slug }, status: { not: "FINALIZED" } },
    orderBy: { year: "desc" },
    include: { snapshot: true },
  });

  if (!season) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className={`border-l-4 ${accent.border} pl-4`}>
          <p
            className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
          >
            {leagueConfig.name}
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold">🔥 Live Prediction League</h1>
        </div>
        <p className="text-bk-text-secondary mt-6">
          No season is open right now — check the{" "}
          <Link href={`/leagues/${slug}/leaderboard`} className={`font-medium ${accent.text}`}>
            final leaderboard
          </Link>{" "}
          for past seasons instead.
        </p>
      </main>
    );
  }

  const predictions = await prisma.prediction.findMany({
    where: { seasonId: season.id, isGuest: false, lockedAt: { not: null } },
    include: { user: true },
    orderBy: [{ projectedScore: "desc" }, { projectedExactBonusCount: "desc" }],
  });

  const ranked = computeRanks(
    predictions.map((prediction) => ({
      id: prediction.id,
      userName: prediction.user?.name ?? "Anonymous",
      score: prediction.projectedScore ?? 0,
      exactBonusCount: prediction.projectedExactBonusCount ?? 0,
    })),
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <div className={`border-l-4 ${accent.border} pl-4`}>
        <p
          className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
        >
          {leagueConfig.name} · {formatSeasonYear(season.year)}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold">🔥 Live Prediction League</h1>
      </div>

      <p className="text-bk-text-secondary mt-3 text-sm">
        {season.snapshot
          ? `Projected scores as if the season ended right now — last synced ${season.snapshot.fetchedAt.toLocaleString()}.`
          : "Standings haven't synced yet — projected scores will appear after the first sync."}
      </p>

      {ranked.length === 0 ? (
        <p className="text-bk-text-secondary mt-6">
          No locked predictions yet — be the first to lock one in.
        </p>
      ) : (
        <div className="border-bk-border mt-6 overflow-hidden rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-bk-surface text-bk-text-secondary text-left text-xs tracking-wide uppercase">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Predictor</th>
                <th className="px-4 py-3 text-right">Exact bonuses</th>
                <th className="px-4 py-3 text-right">Projected score</th>
              </tr>
            </thead>
            <tbody className="divide-bk-border divide-y">
              {ranked.map((entry) => (
                <tr key={entry.id} className="bg-bk-surface">
                  <td className="font-display px-4 py-3 tabular-nums">{entry.rank}</td>
                  <td className="px-4 py-3">{entry.userName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{entry.exactBonusCount}</td>
                  <td className="font-display px-4 py-3 text-right font-semibold tabular-nums">
                    {entry.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
