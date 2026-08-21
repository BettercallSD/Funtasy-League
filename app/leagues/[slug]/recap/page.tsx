import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { formatSeasonYear } from "@/lib/format-season";
import { computeRanks } from "@/lib/rank-predictions";
import { getMedalEmoji } from "@/lib/medals";
import { computeAccuracy, parseScoreBreakdown } from "@/lib/prediction-accuracy";

export default async function LeagueRecapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const leagueConfig = getLeague(slug);
  if (!leagueConfig) notFound();
  const accent = LEAGUE_ACCENT_CLASSES[leagueConfig.slug];

  const session = await requireUser(`/leagues/${slug}/recap`);

  const season = await prisma.season.findFirst({
    where: { league: { slug }, status: "FINALIZED" },
    orderBy: { year: "desc" },
  });

  if (!season) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">No recap yet</h1>
        <p className="text-bk-text-secondary mt-2">
          {leagueConfig.name} hasn&apos;t finished a season yet — check back once one&apos;s
          finalized.
        </p>
      </main>
    );
  }

  const predictions = await prisma.prediction.findMany({
    where: { seasonId: season.id, isGuest: false, lockedAt: { not: null } },
  });

  const ranked = computeRanks(
    predictions.map((prediction) => ({
      id: prediction.id,
      userId: prediction.userId,
      score: prediction.finalScore ?? 0,
      exactBonusCount: prediction.finalExactBonusCount ?? 0,
    })),
  );

  const myEntry = ranked.find((entry) => entry.userId === session.user.id);
  const myPrediction = predictions.find((prediction) => prediction.userId === session.user.id);

  if (!myEntry || !myPrediction) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">No recap for you here</h1>
        <p className="text-bk-text-secondary mt-2">
          You didn&apos;t lock in a prediction for {leagueConfig.name}{" "}
          {formatSeasonYear(season.year)}.
        </p>
      </main>
    );
  }

  const breakdown = parseScoreBreakdown(myPrediction.finalScoreBreakdown);
  const accuracy = breakdown
    ? computeAccuracy(breakdown, {
        topBracketSize:
          season.championsLeagueSlots + season.europaLeagueSlots + season.conferenceLeagueSlots,
        relegationSize: season.directRelegationCount + season.playoffRelegationCount,
      })
    : null;

  const medal = getMedalEmoji(myEntry.rank);
  const isChampion = myEntry.rank === 1;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 text-center">
      <p className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}>
        {leagueConfig.name} · {formatSeasonYear(season.year)}
      </p>

      {isChampion ? (
        <h1 className="font-display mt-2 text-3xl font-bold">
          🏆 {session.user.name} IS THE FUNTASY LEAGUE CHAMPION
        </h1>
      ) : medal ? (
        <h1 className="font-display mt-2 text-3xl font-bold">
          {medal} {session.user.name} finished #{myEntry.rank}
        </h1>
      ) : (
        <h1 className="font-display mt-2 text-3xl font-bold">
          {session.user.name}, you finished #{myEntry.rank} of {ranked.length}
        </h1>
      )}

      <div className="border-bk-border bg-bk-surface mt-8 grid grid-cols-2 gap-4 rounded-lg border p-6">
        <div>
          <p className="text-bk-text-secondary text-xs tracking-wide uppercase">Total score</p>
          <p className="font-display mt-1 text-3xl font-bold tabular-nums">{myEntry.score}</p>
        </div>
        <div>
          <p className="text-bk-text-secondary text-xs tracking-wide uppercase">Accuracy</p>
          <p className="font-display mt-1 text-3xl font-bold tabular-nums">
            {accuracy ? `${accuracy.correct}/${accuracy.total}` : "—"}
          </p>
        </div>
      </div>

      <Link
        href={`/leagues/${slug}/leaderboard`}
        className="text-bk-text-secondary mt-6 inline-block text-sm underline"
      >
        See the full leaderboard
      </Link>
    </main>
  );
}
