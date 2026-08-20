import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { formatSeasonYear } from "@/lib/format-season";
import { getFriendLeagueScores } from "@/lib/friend-league-leaderboard";
import { computeRanks } from "@/lib/rank-predictions";
import { getMedalEmoji } from "@/lib/medals";
import { computeAccuracy, parseScoreBreakdown } from "@/lib/prediction-accuracy";

export default async function FriendLeagueRecapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireUser(`/friend-leagues/${id}/recap`);

  const friendLeague = await prisma.friendLeague.findUnique({
    where: { id },
    include: {
      seasons: { include: { season: { include: { league: true } } } },
      members: true,
    },
  });
  if (!friendLeague) notFound();

  const isMember = friendLeague.members.some((member) => member.userId === session.user.id);
  if (!isMember) notFound();

  const scores = await getFriendLeagueScores(friendLeague.id);
  const ranked = computeRanks(
    scores.map((memberScore) => ({
      ...memberScore,
      score: memberScore.totalScore,
      exactBonusCount: memberScore.totalExactBonusCount,
    })),
  );
  const myEntry = ranked.find((entry) => entry.userId === session.user.id);

  const scopeLabel = friendLeague.seasons
    .map(
      (friendLeagueSeason) =>
        `${friendLeagueSeason.season.league.name} ${formatSeasonYear(friendLeagueSeason.season.year)}`,
    )
    .join(", ");

  if (!myEntry) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold">No recap for you yet</h1>
        <p className="text-bk-text-secondary mt-2">
          You haven&apos;t locked in a prediction for any season {friendLeague.name} is scoped to.
        </p>
      </main>
    );
  }

  // Accuracy only counts seasons that are actually finalized — a
  // still-in-progress season's projected breakdown only has Golden Boot
  // meaningfully scored, so summing it in would be misleading.
  const myPredictions = await prisma.prediction.findMany({
    where: {
      userId: session.user.id,
      isGuest: false,
      seasonId: {
        in: friendLeague.seasons.map((friendLeagueSeason) => friendLeagueSeason.seasonId),
      },
    },
  });

  let totalCorrect = 0;
  let totalPredictable = 0;
  let anyUnfinalized = false;

  for (const friendLeagueSeason of friendLeague.seasons) {
    if (friendLeagueSeason.season.status !== "FINALIZED") {
      anyUnfinalized = true;
      continue;
    }
    const prediction = myPredictions.find(
      (candidate) => candidate.seasonId === friendLeagueSeason.seasonId,
    );
    const breakdown = prediction ? parseScoreBreakdown(prediction.finalScoreBreakdown) : null;
    if (!breakdown) continue;

    const accuracy = computeAccuracy(breakdown, {
      topBracketSize:
        friendLeagueSeason.season.championsLeagueSlots +
        friendLeagueSeason.season.europaLeagueSlots +
        friendLeagueSeason.season.conferenceLeagueSlots,
      relegationSize:
        friendLeagueSeason.season.directRelegationCount +
        friendLeagueSeason.season.playoffRelegationCount,
    });
    totalCorrect += accuracy.correct;
    totalPredictable += accuracy.total;
  }

  const medal = getMedalEmoji(myEntry.rank);
  const isChampion = myEntry.rank === 1;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 text-center">
      <p className="text-bk-text-secondary font-display text-xs font-semibold tracking-widest uppercase">
        {friendLeague.name} · {scopeLabel}
      </p>

      {isChampion ? (
        <h1 className="font-display mt-2 text-3xl font-bold">
          🏆 {session.user.name} IS THE BALL KNOWLEDGE CHAMPION
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
          <p className="font-display mt-1 text-3xl font-bold tabular-nums">{myEntry.totalScore}</p>
        </div>
        <div>
          <p className="text-bk-text-secondary text-xs tracking-wide uppercase">Accuracy</p>
          <p className="font-display mt-1 text-3xl font-bold tabular-nums">
            {totalPredictable > 0 ? `${totalCorrect}/${totalPredictable}` : "—"}
          </p>
        </div>
      </div>
      {anyUnfinalized && (
        <p className="text-bk-text-muted mt-2 text-xs">
          Accuracy only counts seasons that have finished — some in this league&apos;s scope are
          still in progress.
        </p>
      )}

      <Link
        href={`/friend-leagues/${friendLeague.id}`}
        className="text-bk-text-secondary mt-6 inline-block text-sm underline"
      >
        Back to {friendLeague.name}
      </Link>
    </main>
  );
}
