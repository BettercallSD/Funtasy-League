import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAge } from "@/lib/player-age";

const querySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  u23Only: z.enum(["true", "false"]).optional().default("false"),
  seasonId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    u23Only: searchParams.get("u23Only") ?? undefined,
    seasonId: searchParams.get("seasonId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  // Only players currently at a club in this season's league — otherwise
  // search surfaces players from every league at once (e.g. La Liga players
  // showing up while predicting the Premier League).
  const seasonTeams = await prisma.seasonTeam.findMany({
    where: { seasonId: parsed.data.seasonId },
    select: { teamId: true },
  });
  const teamIds = seasonTeams.map((seasonTeam) => seasonTeam.teamId);

  if (teamIds.length === 0) {
    return NextResponse.json([]);
  }

  const players = await prisma.player.findMany({
    where: {
      currentTeamId: { in: teamIds },
      ...(parsed.data.q ? { name: { contains: parsed.data.q, mode: "insensitive" } } : {}),
    },
    include: { currentTeam: true },
    orderBy: { name: "asc" },
    take: 20,
  });

  const filtered =
    parsed.data.u23Only === "true"
      ? players.filter((player) => getAge(player.dateOfBirth) < 23)
      : players;

  return NextResponse.json(
    filtered.map((player) => ({
      id: player.id,
      name: player.name,
      teamName: player.currentTeam?.name ?? null,
      crestUrl: player.currentTeam?.crestUrl ?? null,
    })),
  );
}
