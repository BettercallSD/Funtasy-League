import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAge } from "@/lib/player-age";

const querySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  u23Only: z.enum(["true", "false"]).optional().default("false"),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    u23Only: searchParams.get("u23Only") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const players = await prisma.player.findMany({
    where: parsed.data.q ? { name: { contains: parsed.data.q, mode: "insensitive" } } : undefined,
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
