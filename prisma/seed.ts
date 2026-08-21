// Seeds the 5 fixed League rows, plus a small fixture list of recognizable
// players so the Phase 4 award search/autocomplete has something real to
// find before Phase 5's football-data.org sync exists. Leagues aren't
// admin-manageable (there are always exactly these 5) — Season/Team CRUD in
// the admin section assumes these rows already exist. Safe to re-run.
import { prisma } from "../lib/prisma";
import { LEAGUES } from "../lib/leagues";
import { normalizeName } from "../lib/normalize-name";

// teamName links the player to an existing Team row by exact name (case
// insensitive) so league-scoped search has something real to find — left
// unset for players not currently at a club in one of these 5 leagues'
// already-created teams (search correctly excludes them until their league
// gets its teams added, or Phase 5's real sync takes over).
const PLAYER_FIXTURES: {
  name: string;
  dateOfBirth: string;
  position: string;
  teamName?: string;
}[] = [
  {
    name: "Erling Haaland",
    dateOfBirth: "2000-07-21",
    position: "Forward",
    teamName: "Manchester City",
  },
  { name: "Mohamed Salah", dateOfBirth: "1992-06-15", position: "Forward", teamName: "Liverpool" },
  { name: "Bukayo Saka", dateOfBirth: "2001-09-05", position: "Forward", teamName: "Arsenal" },
  { name: "Jamie Gittens", dateOfBirth: "2004-08-08", position: "Forward", teamName: "Chelsea" },
  { name: "Cole Palmer", dateOfBirth: "2002-05-06", position: "Forward", teamName: "Chelsea" },
  { name: "Declan Rice", dateOfBirth: "1999-01-14", position: "Midfielder", teamName: "Arsenal" },
  {
    name: "Martin Ødegaard",
    dateOfBirth: "1998-12-17",
    position: "Midfielder",
    teamName: "Arsenal",
  },
  {
    name: "Phil Foden",
    dateOfBirth: "2000-05-28",
    position: "Midfielder",
    teamName: "Manchester City",
  },
  {
    name: "Bruno Fernandes",
    dateOfBirth: "1994-09-08",
    position: "Midfielder",
    teamName: "Manchester United",
  },
  {
    name: "Virgil van Dijk",
    dateOfBirth: "1991-07-08",
    position: "Defender",
    teamName: "Liverpool",
  },
  { name: "Alexander Isak", dateOfBirth: "2000-09-21", position: "Forward", teamName: "Liverpool" },
  { name: "Cody Gakpo", dateOfBirth: "1999-05-07", position: "Forward", teamName: "Liverpool" },
  {
    name: "Ollie Watkins",
    dateOfBirth: "1995-12-30",
    position: "Forward",
    teamName: "Aston Villa",
  },
  {
    name: "Morgan Rogers",
    dateOfBirth: "2002-07-26",
    position: "Forward",
    teamName: "Aston Villa",
  },
  {
    name: "Myles Lewis-Skelly",
    dateOfBirth: "2006-09-26",
    position: "Defender",
    teamName: "Arsenal",
  },
  {
    name: "Kobbie Mainoo",
    dateOfBirth: "2005-04-19",
    position: "Midfielder",
    teamName: "Manchester United",
  },
  // Not currently at a club in any league that has teams set up yet.
  { name: "Kevin De Bruyne", dateOfBirth: "1991-06-28", position: "Midfielder" },
  { name: "Jude Bellingham", dateOfBirth: "2003-06-29", position: "Midfielder" },
  { name: "Kylian Mbappé", dateOfBirth: "1998-12-20", position: "Forward" },
  { name: "Vinícius Júnior", dateOfBirth: "2000-07-12", position: "Forward" },
  { name: "Harry Kane", dateOfBirth: "1993-07-28", position: "Forward" },
  { name: "Victor Osimhen", dateOfBirth: "1998-12-29", position: "Forward" },
  { name: "Jamal Musiala", dateOfBirth: "2003-02-26", position: "Midfielder" },
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
    let player = await prisma.player.findFirst({ where: { name: fixture.name } });
    if (!player) {
      player = await prisma.player.create({
        data: {
          name: fixture.name,
          normalizedName: normalizeName(fixture.name),
          dateOfBirth: new Date(fixture.dateOfBirth),
          position: fixture.position,
        },
      });
      console.log(`Seeded player: ${player.name}`);
    }

    if (!fixture.teamName) continue;
    const team = await prisma.team.findFirst({
      where: { name: { equals: fixture.teamName, mode: "insensitive" } },
    });
    if (!team) {
      console.log(`  (skipping team link for ${fixture.name} — "${fixture.teamName}" not found)`);
      continue;
    }
    if (player.currentTeamId !== team.id) {
      await prisma.player.update({ where: { id: player.id }, data: { currentTeamId: team.id } });
      console.log(`  linked ${fixture.name} -> ${team.name}`);
    }
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
