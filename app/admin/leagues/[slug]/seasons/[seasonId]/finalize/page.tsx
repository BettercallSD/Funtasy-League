import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { formatSeasonYear } from "@/lib/format-season";
import { finalizeSeason } from "@/lib/actions/admin-actions";
import { AwardCategory } from "@/lib/generated/prisma/enums";
import { FinalTablePicker, type FinalTableTeam } from "@/components/admin/final-table-picker";

const PLAYER_AWARDS = [
  { category: AwardCategory.GOLDEN_BOOT, label: "Golden Boot", field: "goldenBootPlayerId" },
  { category: AwardCategory.MOST_ASSISTS, label: "Most Assists", field: "mostAssistsPlayerId" },
  {
    category: AwardCategory.YOUNG_PLAYER,
    label: "Young Player of the Season",
    field: "youngPlayerPlayerId",
  },
  {
    category: AwardCategory.EMERGING_PLAYER,
    label: "Emerging Player (U23)",
    field: "emergingPlayerPlayerId",
  },
] as const;

const TEAM_AWARDS = [
  { category: AwardCategory.SURPRISE_TEAM, label: "Surprise Team", field: "surpriseTeamId" },
  {
    category: AwardCategory.DISAPPOINTING_TEAM,
    label: "Disappointing Team",
    field: "disappointingTeamId",
  },
] as const;

export default async function FinalizeSeasonPage({
  params,
}: {
  params: Promise<{ slug: string; seasonId: string }>;
}) {
  await requireAdmin();
  const { slug, seasonId } = await params;
  const leagueConfig = getLeague(slug);
  if (!leagueConfig) notFound();

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      league: true,
      seasonTeams: { include: { team: true }, orderBy: { team: { name: "asc" } } },
      seasonResult: { include: { tableEntries: true, awards: true } },
    },
  });
  if (!season || season.league.slug !== slug) notFound();

  // Only players at a club in this season, same as the predict-flow search —
  // an admin shouldn't be able to award a PL season's Golden Boot to a
  // La Liga player either.
  const seasonTeamIds = season.seasonTeams.map((seasonTeam) => seasonTeam.teamId);
  const players =
    seasonTeamIds.length > 0
      ? await prisma.player.findMany({
          where: { currentTeamId: { in: seasonTeamIds } },
          orderBy: { name: "asc" },
          take: 500,
        })
      : [];

  const accent = LEAGUE_ACCENT_CLASSES[leagueConfig.slug];
  const action = finalizeSeason.bind(null, seasonId, slug);

  const positionByTeamId = new Map(
    season.seasonResult?.tableEntries.map((e) => [e.teamId, e.finalPosition]) ?? [],
  );
  const awardByCategory = new Map(season.seasonResult?.awards.map((a) => [a.category, a]) ?? []);

  // Existing final positions (if this season was already finalized once)
  // seed the initial drag order; otherwise fall back to the alphabetical
  // order the teams were already queried in.
  const initialFinalTable: FinalTableTeam[] = [...season.seasonTeams]
    .sort((a, b) => {
      const posA = positionByTeamId.get(a.teamId);
      const posB = positionByTeamId.get(b.teamId);
      if (posA !== undefined && posB !== undefined) return posA - posB;
      if (posA !== undefined) return -1;
      if (posB !== undefined) return 1;
      return 0;
    })
    .map((seasonTeam) => ({
      id: seasonTeam.teamId,
      name: seasonTeam.team.name,
      crestUrl: seasonTeam.team.crestUrl,
    }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className={`border-l-4 ${accent.border} pl-4`}>
        <p
          className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
        >
          {leagueConfig.name} · {formatSeasonYear(season.year)}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold">Finalize season</h1>
      </div>

      <p className="text-bk-text-secondary mt-3 text-sm">
        This records the ground truth every prediction gets scored against. The actual point
        calculation runs in Phase 5 — for now this just saves the final table and award winners.
        {season.status === "FINALIZED" &&
          " This season is already finalized; saving will overwrite it."}
      </p>

      <form action={action} className="mt-6 space-y-8">
        <section>
          <h2 className="font-display text-lg font-semibold">
            Final table ({season.seasonTeams.length} teams)
          </h2>
          <p className="text-bk-text-secondary mt-1 text-sm">
            Drag teams into their actual final order.
          </p>
          <div className="mt-3">
            <FinalTablePicker teams={initialFinalTable} />
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">Player awards</h2>
          {players.length === 0 && (
            <p className="text-bk-text-secondary mt-2 text-sm">
              No players yet — these sync in from football-data.org (Phase 5) or can be added later.
              Leave blank for now.
            </p>
          )}
          <div className="mt-3 space-y-3">
            {PLAYER_AWARDS.map((award) => (
              <div key={award.field}>
                <label className="text-bk-text-secondary text-sm font-medium" htmlFor={award.field}>
                  {award.label}
                </label>
                <select
                  id={award.field}
                  name={award.field}
                  defaultValue={awardByCategory.get(award.category)?.playerId ?? ""}
                  disabled={players.length === 0}
                  className="border-bk-border bg-bk-bg mt-1 w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                >
                  <option value="">—</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold">Team awards</h2>
          <p className="text-bk-text-secondary mt-2 text-sm">
            Auto-calculated from community predictions in Phase 5 — these fields are the manual
            override.
          </p>
          <div className="mt-3 space-y-3">
            {TEAM_AWARDS.map((award) => (
              <div key={award.field}>
                <label className="text-bk-text-secondary text-sm font-medium" htmlFor={award.field}>
                  {award.label}
                </label>
                <select
                  id={award.field}
                  name={award.field}
                  defaultValue={awardByCategory.get(award.category)?.teamId ?? ""}
                  className="border-bk-border bg-bk-bg mt-1 w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {season.seasonTeams.map((seasonTeam) => (
                    <option key={seasonTeam.teamId} value={seasonTeam.teamId}>
                      {seasonTeam.team.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        <button
          type="submit"
          className={`font-display text-bk-bg rounded-full px-5 py-2 text-sm font-semibold ${accent.bg}`}
        >
          Finalize season
        </button>
      </form>
    </main>
  );
}
