import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import {
  updateSeason,
  addSeasonTeam,
  updateSeasonTeam,
  removeSeasonTeam,
} from "@/lib/actions/admin-actions";
import { SeasonFields } from "@/components/admin/season-fields";

export default async function AdminSeasonPage({
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
    },
  });
  if (!season || season.league.slug !== slug) notFound();

  const accent = LEAGUE_ACCENT_CLASSES[leagueConfig.slug];
  const updateSeasonAction = updateSeason.bind(null, seasonId, slug);
  const addTeamAction = addSeasonTeam.bind(null, seasonId, slug);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className={`border-l-4 ${accent.border} pl-4`}>
        <p
          className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
        >
          {leagueConfig.name}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold">{season.year} season</h1>
      </div>

      <section className="border-bk-border bg-bk-surface mt-6 rounded-lg border p-5">
        <h2 className="font-display text-lg font-semibold">Season configuration</h2>
        <form action={updateSeasonAction} className="mt-4">
          <SeasonFields
            defaultValues={{
              year: season.year,
              teamCount: season.teamCount,
              directRelegationCount: season.directRelegationCount,
              playoffRelegationCount: season.playoffRelegationCount,
              europeanQualificationSlots: season.europeanQualificationSlots,
              predictionLockAt: season.predictionLockAt,
            }}
          />
          <button
            type="submit"
            className="bg-bk-text text-bk-bg mt-4 rounded-full px-5 py-2 text-sm font-semibold"
          >
            Save changes
          </button>
        </form>
      </section>

      <section className="border-bk-border bg-bk-surface mt-6 rounded-lg border p-5">
        <h2 className="font-display text-lg font-semibold">
          Teams ({season.seasonTeams.length}/{season.teamCount})
        </h2>

        <ul className="divide-bk-border mt-4 divide-y">
          {season.seasonTeams.map((seasonTeam) => {
            const updateTeamAction = updateSeasonTeam.bind(null, seasonTeam.id, slug, seasonId);
            const removeTeamAction = removeSeasonTeam.bind(null, seasonTeam.id, slug, seasonId);
            return (
              <li key={seasonTeam.id} className="flex flex-wrap items-center gap-3 py-3">
                <form
                  action={updateTeamAction}
                  className="flex flex-1 flex-wrap items-center gap-2"
                >
                  <input
                    name="name"
                    defaultValue={seasonTeam.team.name}
                    required
                    className="border-bk-border bg-bk-bg w-40 rounded-md border px-2 py-1 text-sm"
                  />
                  <input
                    name="shortName"
                    defaultValue={seasonTeam.team.shortName ?? ""}
                    placeholder="Short name"
                    className="border-bk-border bg-bk-bg w-24 rounded-md border px-2 py-1 text-sm"
                  />
                  <input
                    name="crestUrl"
                    defaultValue={seasonTeam.team.crestUrl ?? ""}
                    placeholder="Crest URL"
                    className="border-bk-border bg-bk-bg w-48 rounded-md border px-2 py-1 text-sm"
                  />
                  <label className="text-bk-text-secondary flex items-center gap-1 text-xs">
                    <input type="checkbox" name="promoted" defaultChecked={seasonTeam.promoted} />
                    Promoted
                  </label>
                  <label className="text-bk-text-secondary flex items-center gap-1 text-xs">
                    <input type="checkbox" name="relegated" defaultChecked={seasonTeam.relegated} />
                    Relegated
                  </label>
                  <button
                    type="submit"
                    className="border-bk-border rounded-md border px-3 py-1 text-xs font-semibold"
                  >
                    Save
                  </button>
                </form>
                <form action={removeTeamAction}>
                  <button
                    type="submit"
                    className="text-xs font-semibold text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        <form
          action={addTeamAction}
          className="border-bk-border mt-4 flex flex-wrap items-end gap-2 border-t pt-4"
        >
          <div>
            <label className="text-bk-text-secondary block text-xs" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              className="border-bk-border bg-bk-bg w-40 rounded-md border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-bk-text-secondary block text-xs" htmlFor="shortName">
              Short name
            </label>
            <input
              id="shortName"
              name="shortName"
              className="border-bk-border bg-bk-bg w-24 rounded-md border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-bk-text-secondary block text-xs" htmlFor="crestUrl">
              Crest URL
            </label>
            <input
              id="crestUrl"
              name="crestUrl"
              className="border-bk-border bg-bk-bg w-48 rounded-md border px-2 py-1 text-sm"
            />
          </div>
          <label className="text-bk-text-secondary flex items-center gap-1 text-xs">
            <input type="checkbox" name="promoted" /> Promoted
          </label>
          <label className="text-bk-text-secondary flex items-center gap-1 text-xs">
            <input type="checkbox" name="relegated" /> Relegated
          </label>
          <button
            type="submit"
            className={`font-display text-bk-bg rounded-full px-4 py-1.5 text-sm font-semibold ${accent.bg}`}
          >
            + Add team
          </button>
        </form>
      </section>

      <Link
        href={`/admin/leagues/${slug}/seasons/${seasonId}/finalize`}
        className="border-bk-border mt-6 inline-block rounded-full border px-4 py-2 text-sm font-semibold"
      >
        Finalize season →
      </Link>
    </main>
  );
}
