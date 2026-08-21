import { syncPlayersForActiveSeasons } from "../lib/sync-players";
import { prisma } from "../lib/prisma";

async function main() {
  const results = await syncPlayersForActiveSeasons();
  for (const result of results) {
    console.log(`${result.leagueSlug}: ${result.status} — ${result.message}`);
  }
}

main().finally(() => prisma.$disconnect());
