import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { formatSeasonYear } from "@/lib/format-season";
import { computeRanks } from "@/lib/rank-predictions";
import { getMedalEmoji } from "@/lib/medals";
import { getDisplayName } from "@/lib/display-name";

export default async function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const leagueConfig = getLeague(slug);
  if (!leagueConfig) notFound();
  const session = await requireUser(`/leagues/${slug}/leaderboard`);
  const accent = LEAGUE_ACCENT_CLASSES[leagueConfig.slug];

  // Most recently finalized season for this league — scores only exist
  // (and only mean anything) once an admin has finalized a season.
  const season = await prisma.season.findFirst({
    where: { league: { slug }, status: "FINALIZED" },
    orderBy: { year: "desc" },
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
          <h1 className="font-display mt-1 text-2xl font-bold">Leaderboard</h1>
        </div>
        <p className="text-bk-text-secondary mt-6">
          No season has finished yet — check the{" "}
          <Link href={`/leagues/${slug}/live`} className={`font-medium ${accent.text}`}>
            live projected leaderboard
          </Link>{" "}
          instead.
        </p>
      </main>
    );
  }

  // Guest predictions never enter the public leaderboard — this boundary is
  // structural (isGuest checked here), not a UI-level hide.
  const predictions = await prisma.prediction.findMany({
    where: { seasonId: season.id, isGuest: false, lockedAt: { not: null } },
    include: { user: true },
    orderBy: [{ finalScore: "desc" }, { finalExactBonusCount: "desc" }],
  });

  const ranked = computeRanks(
    predictions.map((prediction) => ({
      id: prediction.id,
      userId: prediction.userId,
      userName: prediction.user ? getDisplayName(prediction.user) : "Anonymous",
      score: prediction.finalScore ?? 0,
      exactBonusCount: prediction.finalExactBonusCount ?? 0,
    })),
  );

  const viewerIsRanked = Boolean(
    session?.user?.id && ranked.some((entry) => entry.userId === session.user.id),
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <div className={`border-l-4 ${accent.border} pl-4`}>
        <p
          className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
        >
          {leagueConfig.name} · {formatSeasonYear(season.year)}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold">Final leaderboard</h1>
      </div>

      {viewerIsRanked && (
        <Link
          href={`/leagues/${slug}/recap`}
          className={`font-display mt-4 inline-block text-sm font-semibold ${accent.text}`}
        >
          🏆 See my recap
        </Link>
      )}

      {ranked.length === 0 ? (
        <p className="text-bk-text-secondary mt-6">
          No locked predictions for this season — nobody locked one in before the deadline.
        </p>
      ) : (
        <div className="border-bk-border mt-6 overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="bg-bk-surface text-bk-text-secondary text-left text-xs tracking-wide uppercase">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Predictor</th>
                  <th className="px-4 py-3 text-right">Exact bonuses</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-bk-border divide-y">
                {ranked.map((entry) => (
                  <tr key={entry.id} className="bg-bk-surface">
                    <td className="font-display px-4 py-3 tabular-nums">
                      {getMedalEmoji(entry.rank) ?? entry.rank}
                    </td>
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
        </div>
      )}
    </main>
  );
}
