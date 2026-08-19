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
          Drag the table into your predicted final order, then track how you stack up against
          everyone else.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/predict/${league.slug}`}
            className={`font-display text-bk-bg inline-block rounded-full px-5 py-2 text-sm font-semibold ${accent.bg}`}
          >
            Predict the table
          </Link>
          <Link
            href={`/leagues/${league.slug}/live`}
            className="font-display border-bk-border inline-block rounded-full border px-5 py-2 text-sm font-semibold"
          >
            🔥 Live Prediction League
          </Link>
          <Link
            href={`/leagues/${league.slug}/leaderboard`}
            className="font-display border-bk-border inline-block rounded-full border px-5 py-2 text-sm font-semibold"
          >
            Final leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
