// Seeds the 5 fixed League rows, plus a small fixture list of recognizable
// players so the Phase 4 award search/autocomplete has something real to
// find before Phase 5's football-data.org sync exists. Leagues aren't
// admin-manageable (there are always exactly these 5) — Season/Team CRUD in
// the admin section assumes these rows already exist. Safe to re-run.
import { prisma } from "../lib/prisma";
import { LEAGUES } from "../lib/leagues";

// currentTeamId intentionally left unset — Team rows only exist once an
// admin creates a season's roster, so these aren't linked to any team yet.
const PLAYER_FIXTURES: { name: string; dateOfBirth: string; position: string }[] = [
  { name: "Erling Haaland", dateOfBirth: "2000-07-21", position: "Forward" },
  { name: "Mohamed Salah", dateOfBirth: "1992-06-15", position: "Forward" },
  { name: "Kevin De Bruyne", dateOfBirth: "1991-06-28", position: "Midfielder" },
  { name: "Jude Bellingham", dateOfBirth: "2003-06-29", position: "Midfielder" },
  { name: "Kylian Mbappé", dateOfBirth: "1998-12-20", position: "Forward" },
  { name: "Vinícius Júnior", dateOfBirth: "2000-07-12", position: "Forward" },
  { name: "Harry Kane", dateOfBirth: "1993-07-28", position: "Forward" },
  { name: "Victor Osimhen", dateOfBirth: "1998-12-29", position: "Forward" },
  { name: "Jamal Musiala", dateOfBirth: "2003-02-26", position: "Midfielder" },
  { name: "Bukayo Saka", dateOfBirth: "2001-09-05", position: "Forward" },
  { name: "Jamie Gittens", dateOfBirth: "2004-08-08", position: "Forward" },
  { name: "Lamine Yamal", dateOfBirth: "2007-07-13", position: "Forward" },
  { name: "Warren Zaïre-Emery", dateOfBirth: "2006-01-08", position: "Midfielder" },
  { name: "Endrick", dateOfBirth: "2006-07-21", position: "Forward" },
  { name: "Arda Güler", dateOfBirth: "2005-02-25", position: "Midfielder" },
];

async function main() {
  for (const league of LEAGUES) {
    const row = await prisma.league.upsert({
      where: { slug: league.slug },
      update: { name: league.name, accentColor: league.accentHex },
      create: { slug: league.slug, name: league.name, accentColor: league.accentHex },
    });
    console.log(`Seeded league: ${row.name} (${row.slug})`);
  }

  for (const fixture of PLAYER_FIXTURES) {
    const existing = await prisma.player.findFirst({ where: { name: fixture.name } });
    if (existing) continue;
    const player = await prisma.player.create({
      data: {
        name: fixture.name,
        dateOfBirth: new Date(fixture.dateOfBirth),
        position: fixture.position,
      },
    });
    console.log(`Seeded player: ${player.name}`);
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
