// Seeds the 5 fixed League rows. Leagues themselves aren't admin-manageable
// (there are always exactly these 5) — Season/Team CRUD in the admin section
// assumes these rows already exist. Safe to re-run: upserts by slug.
import { prisma } from "../lib/prisma";
import { LEAGUES } from "../lib/leagues";

async function main() {
  for (const league of LEAGUES) {
    const row = await prisma.league.upsert({
      where: { slug: league.slug },
      update: { name: league.name, accentColor: league.accentHex },
      create: { slug: league.slug, name: league.name, accentColor: league.accentHex },
    });
    console.log(`Seeded league: ${row.name} (${row.slug})`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
