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
  const season = await prisma.season.findFirst({
    where: { league: { slug }, status: { not: "FINALIZED" } },
    orderBy: { year: "desc" },
    include: {
      seasonTeams: { include: { team: true }, orderBy: { team: { name: "asc" } } },
    },
  });

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

  const popular = await getPopularPlayerPicks(season.id);

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
        Heads up — this won&apos;t be saved to an account. You&apos;ll get a link to your result at
        the end, but if you lose it, it&apos;s gone for good.{" "}
        <Link href={`/predict/${slug}`} className={`font-medium ${accent.text}`}>
          Sign in first
        </Link>{" "}
        if you want it saved to come back to later — or to actually compete for real.
      </p>

      <div className="mt-6">
        <GuestPredictionForm
          slug={slug}
          seasonId={season.id}
          initialTeams={initialTeams}
          awardTeams={awardTeams}
          popular={popular}
        />
      </div>
    </main>
  );
}
