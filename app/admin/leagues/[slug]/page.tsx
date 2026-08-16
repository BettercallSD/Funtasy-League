import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { formatSeasonYear } from "@/lib/format-season";

export default async function AdminLeagueSeasonsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const leagueConfig = getLeague(slug);
  if (!leagueConfig) notFound();

  const league = await prisma.league.findUnique({
    where: { slug },
    include: { seasons: { orderBy: { year: "desc" } } },
  });
  if (!league) notFound();

  const accent = LEAGUE_ACCENT_CLASSES[leagueConfig.slug];

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className={`border-l-4 ${accent.border} pl-4`}>
        <p
          className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
        >
          Admin
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold">{league.name} seasons</h1>
      </div>

      <Link
        href={`/admin/leagues/${slug}/seasons/new`}
        className={`font-display text-bk-bg mt-6 inline-block rounded-full px-4 py-2 text-sm font-semibold ${accent.bg}`}
      >
        + New season
      </Link>

      <ul className="border-bk-border divide-bk-border mt-6 divide-y rounded-lg border">
        {league.seasons.length === 0 && (
          <li className="text-bk-text-secondary p-4 text-sm">No seasons yet.</li>
        )}
        {league.seasons.map((season) => (
          <li key={season.id}>
            <Link
              href={`/admin/leagues/${slug}/seasons/${season.id}`}
              className="hover:bg-bk-surface-raised flex items-center justify-between p-4"
            >
              <span className="font-display font-semibold">{formatSeasonYear(season.year)}</span>
              <span className="text-bk-text-secondary text-xs tracking-wide uppercase">
                {season.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
