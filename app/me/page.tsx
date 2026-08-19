import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { formatSeasonYear } from "@/lib/format-season";

export default async function MyPredictionsPage() {
  const session = await requireUser("/me");

  const [predictions, claimedGuestPrediction] = await Promise.all([
    prisma.prediction.findMany({
      where: { userId: session.user.id, isGuest: false },
      include: { season: { include: { league: true } } },
      orderBy: [{ season: { year: "desc" } }],
    }),
    prisma.prediction.findUnique({
      where: { claimedByUserId: session.user.id },
      include: { season: { include: { league: true } } },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="font-display text-2xl font-bold">My predictions</h1>

      {predictions.length === 0 ? (
        <p className="text-bk-text-secondary mt-6">You haven&apos;t made any predictions yet.</p>
      ) : (
        <ul className="border-bk-border divide-bk-border mt-6 divide-y rounded-lg border">
          {predictions.map((prediction) => (
            <li key={prediction.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <Link
                  href={`/predict/${prediction.season.league.slug}`}
                  className="font-display font-semibold hover:underline"
                >
                  {prediction.season.league.name} · {formatSeasonYear(prediction.season.year)}
                </Link>
                <p className="text-bk-text-secondary mt-0.5 text-xs">
                  {prediction.lockedAt
                    ? `Locked in ${prediction.lockedAt.toLocaleDateString()}`
                    : "Draft — not locked in"}
                </p>
              </div>
              <span className="font-display font-semibold tabular-nums">
                {prediction.finalScore ?? prediction.projectedScore ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {claimedGuestPrediction && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold">Claimed guest prediction</h2>
          <p className="text-bk-text-secondary mt-1 text-sm">
            Personal history only — this never counted on any leaderboard.
          </p>
          <Link
            href={`/guest/result/${claimedGuestPrediction.guestToken}`}
            className="border-bk-border bg-bk-surface hover:bg-bk-surface-raised mt-3 flex items-center justify-between rounded-lg border p-4 text-sm"
          >
            <span className="font-display font-semibold">
              {claimedGuestPrediction.season.league.name} ·{" "}
              {formatSeasonYear(claimedGuestPrediction.season.year)}
            </span>
            <span className="text-bk-text-secondary text-xs">
              {claimedGuestPrediction.submittedLabel}
            </span>
          </Link>
        </section>
      )}
    </main>
  );
}
