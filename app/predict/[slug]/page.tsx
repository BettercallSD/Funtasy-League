import { notFound } from "next/navigation";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { formatSeasonYear } from "@/lib/format-season";
import { getPopularPlayerPicks } from "@/lib/popular-awards";
import { CountdownBanner } from "@/components/countdown-banner";
import { PredictionBoard, type PredictionTeam } from "@/components/prediction-board";
import { AwardPicks, type AwardSelections } from "@/components/award-picks";
import type { PlayerOption } from "@/components/player-picker";
import type { TeamOption } from "@/components/team-picker";

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

  const [prediction, popular] = await Promise.all([
    prisma.prediction.findUnique({
      where: { userId_seasonId: { userId: session.user.id, seasonId: season.id } },
      include: {
        tableEntries: true,
        awards: { include: { player: { include: { currentTeam: true } }, team: true } },
      },
    }),
    getPopularPlayerPicks(season.id),
  ]);

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
  // Locking in doesn't freeze the prediction — it's editable (and
  // re-lockable) as many times as the user wants right up until the
  // season's deadline, which is the only thing that makes it read-only.
  const readOnly = seasonClosed;

  let readOnlyReason: string | undefined;
  if (seasonClosed) {
    readOnlyReason = lockedAt
      ? "Predictions are closed for this season — your locked-in prediction is final."
      : "Predictions closed before you locked one in for this season.";
  }

  const awardTeams: TeamOption[] = season.seasonTeams.map((seasonTeam) => ({
    id: seasonTeam.teamId,
    name: seasonTeam.team.name,
    crestUrl: seasonTeam.team.crestUrl,
  }));

  const selections: AwardSelections = {};
  for (const award of prediction?.awards ?? []) {
    if (award.player) {
      const option: PlayerOption = {
        id: award.player.id,
        name: award.player.name,
        teamName: award.player.currentTeam?.name ?? null,
        crestUrl: award.player.currentTeam?.crestUrl ?? null,
      };
      if (award.category === "GOLDEN_BOOT") selections.goldenBoot = option;
      else if (award.category === "MOST_ASSISTS") selections.mostAssists = option;
      else if (award.category === "YOUNG_PLAYER") selections.youngPlayer = option;
      else if (award.category === "EMERGING_PLAYER") selections.emergingPlayer = option;
    } else if (award.team) {
      const option: TeamOption = {
        id: award.team.id,
        name: award.team.name,
        crestUrl: award.team.crestUrl,
      };
      if (award.category === "SURPRISE_TEAM") selections.surpriseTeam = option;
      else if (award.category === "DISAPPOINTING_TEAM") selections.disappointingTeam = option;
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <div className={`border-l-4 ${accent.border} pl-4`}>
        <p
          className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
        >
          {leagueConfig.name} · {formatSeasonYear(season.year)}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold">Predict the final table</h1>
      </div>

      <div className="mt-6">
        {!seasonClosed && <CountdownBanner lockAt={season.predictionLockAt.toISOString()} />}
        {!seasonClosed && lockedAt && (
          <p className="text-bk-text-secondary mb-4 text-sm">
            Locked in on {lockedAt.toLocaleString()} — you can keep changing it until the deadline.
          </p>
        )}
        <PredictionBoard
          seasonId={season.id}
          initialTeams={initialTeams}
          readOnly={readOnly}
          readOnlyReason={readOnlyReason}
        />
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl font-bold">Award predictions</h2>
        <div className="mt-4">
          <AwardPicks
            seasonId={season.id}
            teams={awardTeams}
            popular={popular}
            selections={selections}
            disabled={readOnly}
          />
        </div>
      </div>
    </main>
  );
}
