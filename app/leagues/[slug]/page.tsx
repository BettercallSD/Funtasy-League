import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";

export default async function LeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = getLeague(slug);
  if (!league) notFound();

  const accent = LEAGUE_ACCENT_CLASSES[league.slug];

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className={`border-l-4 ${accent.border} pl-4`}>
        <p
          className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
        >
          {league.name}
        </p>
        <h1 className="font-display mt-1 text-3xl font-bold">Predict the final table</h1>
      </div>

      <div className="border-bk-border bg-bk-surface mt-8 rounded-lg border p-8 text-center">
        <p className="text-bk-text-secondary">
          Standings, teams, and the drag-and-drop predictor for {league.name} aren&apos;t wired up
          yet — that lands in Phases 2 and 3.
        </p>
        <Link
          href={`/predict/${league.slug}`}
          className={`font-display text-bk-bg mt-4 inline-block rounded-full px-5 py-2 text-sm font-semibold ${accent.bg}`}
        >
          Predict the table
        </Link>
      </div>
    </main>
  );
}
