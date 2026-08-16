import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { formatSeasonYear } from "@/lib/format-season";
import { finalizeSeason } from "@/lib/actions/admin-actions";
import { AwardCategory } from "@/lib/generated/prisma/enums";

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

  const [season, players] = await Promise.all([
    prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        league: true,
        seasonTeams: { include: { team: true }, orderBy: { team: { name: "asc" } } },
        seasonResult: { include: { tableEntries: true, awards: true } },
      },
    }),
    prisma.player.findMany({ orderBy: { name: "asc" }, take: 500 }),
  ]);
  if (!season || season.league.slug !== slug) notFound();

  const accent = LEAGUE_ACCENT_CLASSES[leagueConfig.slug];
  const action = finalizeSeason.bind(null, seasonId, slug);

  const positionByTeamId = new Map(
    season.seasonResult?.tableEntries.map((e) => [e.teamId, e.finalPosition]) ?? [],
  );
  const awardByCategory = new Map(season.seasonResult?.awards.map((a) => [a.category, a]) ?? []);

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
          <ul className="divide-bk-border border-bk-border mt-3 divide-y rounded-lg border">
            {season.seasonTeams.map((seasonTeam) => (
              <li key={seasonTeam.id} className="flex items-center justify-between gap-3 p-3">
                <span className="text-sm">{seasonTeam.team.name}</span>
                <input
                  type="number"
                  name={`position_${seasonTeam.teamId}`}
                  min={1}
                  max={season.seasonTeams.length}
                  required
                  defaultValue={positionByTeamId.get(seasonTeam.teamId)}
                  className="border-bk-border bg-bk-bg w-20 rounded-md border px-2 py-1 text-right text-sm tabular-nums"
                />
              </li>
            ))}
          </ul>
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
