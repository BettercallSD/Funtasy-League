import { notFound } from "next/navigation";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { CountdownBanner } from "@/components/countdown-banner";
import { PredictionBoard, type PredictionTeam } from "@/components/prediction-board";

export default async function PredictPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const leagueConfig = getLeague(slug);
  if (!leagueConfig) notFound();

  const session = await requireUser(`/predict/${slug}`);
  const accent = LEAGUE_ACCENT_CLASSES[leagueConfig.slug];

  const season = await prisma.season.findFirst({
    where: { league: { slug }, status: { not: "FINALIZED" } },
    orderBy: { year: "desc" },
    include: {
      seasonTeams: { include: { team: true }, orderBy: { team: { name: "asc" } } },
    },
  });

  if (!season || season.seasonTeams.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className={`border-l-4 ${accent.border} pl-4`}>
          <p
            className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
          >
            {leagueConfig.name}
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold">Predict the final table</h1>
        </div>
        <p className="text-bk-text-secondary mt-6">
          No season is open for predictions yet — check back once the commissioner sets one up.
        </p>
      </main>
    );
  }

  const prediction = await prisma.prediction.findUnique({
    where: { userId_seasonId: { userId: session.user.id, seasonId: season.id } },
    include: { tableEntries: true },
  });

  const teamsById = new Map(
    season.seasonTeams.map((seasonTeam) => [seasonTeam.teamId, seasonTeam.team]),
  );
  const orderedTeamIds =
    prediction && prediction.tableEntries.length > 0
      ? [...prediction.tableEntries]
          .sort((a, b) => a.predictedPosition - b.predictedPosition)
          .map((entry) => entry.teamId)
      : season.seasonTeams.map((seasonTeam) => seasonTeam.teamId);

  const initialTeams: PredictionTeam[] = orderedTeamIds
    .map((teamId) => teamsById.get(teamId))
    .filter((team): team is NonNullable<typeof team> => Boolean(team))
    .map((team) => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      crestUrl: team.crestUrl,
    }));

  const lockedAt = prediction?.lockedAt ?? null;
  const seasonClosed = new Date() >= season.predictionLockAt;
  const readOnly = seasonClosed || lockedAt !== null;

  let readOnlyReason: string | undefined;
  if (lockedAt) {
    readOnlyReason = `You locked this in on ${lockedAt.toLocaleString()}.`;
  } else if (seasonClosed) {
    readOnlyReason = "Predictions closed before you locked one in for this season.";
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <div className={`border-l-4 ${accent.border} pl-4`}>
        <p
          className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
        >
          {leagueConfig.name} · {season.year}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold">Predict the final table</h1>
      </div>

      <div className="mt-6">
        {!seasonClosed && <CountdownBanner lockAt={season.predictionLockAt.toISOString()} />}
        <PredictionBoard
          seasonId={season.id}
          initialTeams={initialTeams}
          readOnly={readOnly}
          readOnlyReason={readOnlyReason}
        />
      </div>
    </main>
  );
}
