import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { formatSeasonYear } from "@/lib/format-season";
import { createFriendLeague } from "@/lib/actions/friend-league-actions";

export default async function NewFriendLeaguePage() {
  await requireUser("/friend-leagues/new");

  const seasons = await prisma.season.findMany({
    include: { league: true },
    orderBy: [{ league: { name: "asc" } }, { year: "desc" }],
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Create a friend league</h1>
      <p className="text-bk-text-secondary mt-2 text-sm">
        Pick which season(s) it covers — points are only ever compared within that exact scope, so
        everyone stays like-for-like.
      </p>

      <form action={createFriendLeague} className="mt-6 space-y-6">
        <div>
          <label className="text-bk-text-secondary text-sm font-medium" htmlFor="name">
            League name
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={60}
            className="border-bk-border bg-bk-bg mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <fieldset>
          <legend className="text-bk-text-secondary text-sm font-medium">Seasons</legend>
          {seasons.length === 0 && (
            <p className="text-bk-text-secondary mt-2 text-sm">
              No seasons exist yet — a commissioner needs to set one up first.
            </p>
          )}
          <div className="mt-2 space-y-2">
            {seasons.map((season) => (
              <label
                key={season.id}
                className="border-bk-border flex items-center gap-2 rounded-md border p-2 text-sm"
              >
                <input type="checkbox" name="seasonIds" value={season.id} />
                {season.league.name} · {formatSeasonYear(season.year)}
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="font-display bg-bk-text text-bk-bg rounded-full px-5 py-2 text-sm font-semibold"
        >
          Create league
        </button>
      </form>
    </main>
  );
}
