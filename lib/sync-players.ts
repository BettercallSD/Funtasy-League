import { prisma } from "@/lib/prisma";
import { fetchSquads, delay, COMPETITION_CODES } from "@/lib/football-data-api";
import { matchTeamByName } from "@/lib/match-team-name";
import { normalizeName } from "@/lib/normalize-name";
import type { LeagueSlug } from "@/lib/leagues";
import type { SyncResult } from "@/lib/sync-standings";

function isSupportedLeagueSlug(slug: string): slug is LeagueSlug {
  return slug in COMPETITION_CODES;
}

// Pulls the full current squad for every team in every non-finalized
// season's league and upserts Player rows (name, dateOfBirth, position,
// currentTeamId) — this is what makes award search/autocomplete cover the
// real league roster instead of a small hand-picked fixture list. Players
// without a dateOfBirth are skipped since the Young Player of the Season (U23) category
// depends on it.
export async function syncPlayersForActiveSeasons(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  const seasons = await prisma.season.findMany({
    where: { status: { not: "FINALIZED" } },
    include: { league: true, seasonTeams: { include: { team: true } } },
  });

  for (const season of seasons) {
    const leagueSlug = season.league.slug;
    if (!isSupportedLeagueSlug(leagueSlug)) {
      results.push({ leagueSlug, status: "skipped", message: "no competition code mapping" });
      continue;
    }

    try {
      const squads = await fetchSquads(leagueSlug);
      await delay(6500); // stay under football-data.org's 10 req/min free-tier limit

      const candidateTeams = season.seasonTeams.map((seasonTeam) => ({
        id: seasonTeam.teamId,
        name: seasonTeam.team.name,
      }));

      const allNames = squads.flatMap((squad) => squad.players.map((player) => player.name));
      const existingPlayers = await prisma.player.findMany({ where: { name: { in: allNames } } });
      const existingByName = new Map(existingPlayers.map((player) => [player.name, player]));

      let playersUpserted = 0;
      for (const squad of squads) {
        const teamId = matchTeamByName(squad.teamExternalName, candidateTeams);
        if (!teamId) continue;

        for (const squadPlayer of squad.players) {
          if (!squadPlayer.dateOfBirth) continue;
          const dateOfBirth = new Date(squadPlayer.dateOfBirth);

          const existing = existingByName.get(squadPlayer.name);
          if (existing) {
            await prisma.player.update({
              where: { id: existing.id },
              data: {
                dateOfBirth,
                position: squadPlayer.position,
                currentTeamId: teamId,
                normalizedName: normalizeName(squadPlayer.name),
              },
            });
          } else {
            const created = await prisma.player.create({
              data: {
                name: squadPlayer.name,
                normalizedName: normalizeName(squadPlayer.name),
                dateOfBirth,
                position: squadPlayer.position,
                currentTeamId: teamId,
              },
            });
            existingByName.set(squadPlayer.name, created);
          }
          playersUpserted += 1;
        }
      }

      results.push({ leagueSlug, status: "ok", message: `${playersUpserted} players synced` });
    } catch (error) {
      results.push({
        leagueSlug,
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
