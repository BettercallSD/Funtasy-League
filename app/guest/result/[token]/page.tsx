import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { formatSeasonYear } from "@/lib/format-season";
import { claimGuestPrediction } from "@/lib/actions/claim-actions";

function formatCategoryLabel(category: string): string {
  return category
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function GuestResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const prediction = await prisma.prediction.findUnique({
    where: { guestToken: token },
    include: {
      season: { include: { league: true } },
      tableEntries: { include: { team: true }, orderBy: { predictedPosition: "asc" } },
      awards: { include: { player: true, team: true } },
    },
  });
  if (!prediction || !prediction.isGuest) notFound();

  const leagueConfig = getLeague(prediction.season.league.slug);
  const accent = leagueConfig ? LEAGUE_ACCENT_CLASSES[leagueConfig.slug] : null;

  const session = await auth();
  const canClaim = Boolean(session?.user?.id) && !prediction.claimed;
  const claimAction = claimGuestPrediction.bind(null, token);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <div className={accent ? `border-l-4 ${accent.border} pl-4` : undefined}>
        <p
          className={`font-display text-xs font-semibold tracking-widest uppercase ${accent?.text ?? "text-bk-text-secondary"}`}
        >
          {prediction.season.league.name} · {formatSeasonYear(prediction.season.year)}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold">Guest prediction</h1>
        <p className="text-bk-text-secondary mt-1 text-sm">{prediction.submittedLabel}</p>
      </div>

      <p className="text-bk-text-secondary mt-4 text-sm">
        This is a personal, share-only result — it never counts on any leaderboard.{" "}
        <Link
          href={`/predict/${prediction.season.league.slug}`}
          className={`font-medium ${accent?.text ?? ""}`}
        >
          Make a real prediction
        </Link>{" "}
        to actually compete.
      </p>

      {prediction.claimed && (
        <p className="border-bk-border bg-bk-surface text-bk-text-secondary mt-4 rounded-md border p-3 text-sm">
          This prediction has been claimed and saved to an account.
        </p>
      )}

      {canClaim && (
        <form action={claimAction} className="mt-4">
          <button
            type="submit"
            className="border-bk-border rounded-full border px-4 py-2 text-sm font-semibold"
          >
            Claim this prediction (save it to my account)
          </button>
        </form>
      )}
      {!session?.user && (
        <p className="text-bk-text-secondary mt-4 text-sm">
          <Link
            href={`/signin?callbackUrl=${encodeURIComponent(`/guest/result/${token}`)}`}
            className={`font-medium ${accent?.text ?? ""}`}
          >
            Sign in
          </Link>{" "}
          to claim this as personal history.
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">Predicted table</h2>
        <ol className="border-bk-border divide-bk-border mt-3 divide-y rounded-lg border">
          {prediction.tableEntries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
              <span className="font-display text-bk-text-secondary w-6 tabular-nums">
                {entry.predictedPosition}
              </span>
              <span className="flex-1 text-sm font-medium">{entry.team.name}</span>
            </li>
          ))}
        </ol>
      </section>

      {prediction.awards.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold">Award picks</h2>
          <ul className="border-bk-border divide-bk-border mt-3 divide-y rounded-lg border">
            {prediction.awards.map((award) => (
              <li key={award.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-bk-text-secondary">
                  {formatCategoryLabel(award.category)}
                </span>
                <span className="font-medium">{award.player?.name ?? award.team?.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
