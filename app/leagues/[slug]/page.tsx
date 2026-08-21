import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";

export default async function LeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = getLeague(slug);
  if (!league) notFound();

  const session = await auth();
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
          Drag every club into the order you think they&apos;ll finish — champion to relegated,
          nothing skipped — plus six end-of-season awards. Lock it in, then spend the season finding
          out if you actually called it or just talk a good game.
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
        {!session?.user && (
          <Link
            href={`/guest/predict/${league.slug}`}
            className="text-bk-text-secondary mt-4 inline-block text-sm underline"
          >
            Just want to try it? Predict without signing in
          </Link>
        )}
      </div>
    </main>
  );
}
