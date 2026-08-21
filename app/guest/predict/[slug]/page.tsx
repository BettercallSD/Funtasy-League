import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeague, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";
import { prisma } from "@/lib/prisma";
import { getPopularPlayerPicks } from "@/lib/popular-awards";
import { GuestPredictionForm } from "@/components/guest-prediction-form";
import type { PredictionTeam } from "@/components/prediction-board";
import type { TeamOption } from "@/components/team-picker";

export default async function GuestPredictPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const leagueConfig = getLeague(slug);
  if (!leagueConfig) notFound();
  const accent = LEAGUE_ACCENT_CLASSES[leagueConfig.slug];

  // Guests can predict "any time" (CLAUDE.md) — no predictionLockAt gating,
  // unlike the authenticated flow. Just needs a season that isn't over yet.
  //
  // TEMPORARY diagnostic try/catch: production was throwing an opaque
  // "Error: [object Object]" from deep inside Next's own RSC internals,
  // meaning whatever actually failed got mangled before any of our own
  // logging could see it. Catching it here — before React's Flight
  // serializer is involved at all — surfaces the real error directly on
  // the page so we can see whether it's the DB query or something else
  // downstream. Remove once the real cause is found.
  let season;
  try {
    season = await prisma.season.findFirst({
      where: { league: { slug }, status: { not: "FINALIZED" } },
      orderBy: { year: "desc" },
      include: {
        seasonTeams: { include: { team: true }, orderBy: { team: { name: "asc" } } },
      },
    });
  } catch (err) {
    const details =
      err instanceof Error
        ? `${err.name}: ${err.message}\n\n${err.stack}`
        : (() => {
            try {
              return JSON.stringify(err, Object.getOwnPropertyNames(err ?? {}), 2);
            } catch {
              return String(err);
            }
          })();
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="font-display text-xl font-bold">DEBUG: season query threw</h1>
        <pre className="mt-4 overflow-x-auto text-xs whitespace-pre-wrap">{details}</pre>
      </main>
    );
  }

  if (!season || season.seasonTeams.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className={`border-l-4 ${accent.border} pl-4`}>
          <p
            className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
          >
            {leagueConfig.name}
          </p>
          <h1 className="font-display mt-1 text-2xl font-bold">
            Try a prediction — no sign-in needed
          </h1>
        </div>
        <p className="text-bk-text-secondary mt-6">
          No season is open for predictions yet — check back once the commissioner sets one up.
        </p>
      </main>
    );
  }

  const initialTeams: PredictionTeam[] = season.seasonTeams.map((seasonTeam) => ({
    id: seasonTeam.teamId,
    name: seasonTeam.team.name,
    shortName: seasonTeam.team.shortName,
    crestUrl: seasonTeam.team.crestUrl,
  }));

  const awardTeams: TeamOption[] = season.seasonTeams.map((seasonTeam) => ({
    id: seasonTeam.teamId,
    name: seasonTeam.team.name,
    crestUrl: seasonTeam.team.crestUrl,
  }));

  let popular;
  try {
    popular = await getPopularPlayerPicks(season.id);
  } catch (err) {
    const details =
      err instanceof Error
        ? `${err.name}: ${err.message}\n\n${err.stack}`
        : (() => {
            try {
              return JSON.stringify(err, Object.getOwnPropertyNames(err ?? {}), 2);
            } catch {
              return String(err);
            }
          })();
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="font-display text-xl font-bold">DEBUG: getPopularPlayerPicks threw</h1>
        <pre className="mt-4 overflow-x-auto text-xs whitespace-pre-wrap">{details}</pre>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <div className={`border-l-4 ${accent.border} pl-4`}>
        <p
          className={`font-display text-xs font-semibold tracking-widest uppercase ${accent.text}`}
        >
          {leagueConfig.name}
        </p>
        <h1 className="font-display mt-1 text-2xl font-bold">
          Try a prediction — no sign-in needed
        </h1>
      </div>
      <p className="text-bk-text-secondary mt-3 text-sm">
        This won&apos;t count on any leaderboard, but you&apos;ll get a shareable result card. Want
        it to count for real?{" "}
        <Link href={`/predict/${slug}`} className={`font-medium ${accent.text}`}>
          Sign in and predict
        </Link>{" "}
        instead.
      </p>

      <div className="mt-6">
        <GuestPredictionForm
          seasonId={season.id}
          initialTeams={initialTeams}
          awardTeams={awardTeams}
          popular={popular}
        />
      </div>
    </main>
  );
}
