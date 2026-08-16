import { prisma } from "@/lib/prisma";
import { AwardCategory } from "@/lib/generated/prisma/enums";
import type { PlayerOption } from "@/components/player-picker";
import type { PopularPlayerPicks } from "@/components/award-picks";

const PLAYER_CATEGORIES = [
  AwardCategory.GOLDEN_BOOT,
  AwardCategory.MOST_ASSISTS,
  AwardCategory.YOUNG_PLAYER,
  AwardCategory.EMERGING_PLAYER,
] as const;

// Real popularity, not a placeholder — counts how many other (locked or
// draft) non-guest predictions in this season already picked each player,
// per category, and returns the top 3. Empty until people actually predict.
export async function getPopularPlayerPicks(seasonId: string): Promise<PopularPlayerPicks> {
  const rows = await prisma.predictionAward.groupBy({
    by: ["category", "playerId"],
    where: {
      playerId: { not: null },
      category: { in: [...PLAYER_CATEGORIES] },
      prediction: { seasonId, isGuest: false },
    },
    _count: { playerId: true },
    orderBy: { _count: { playerId: "desc" } },
  });

  const idsByCategory: Record<(typeof PLAYER_CATEGORIES)[number], string[]> = {
    GOLDEN_BOOT: [],
    MOST_ASSISTS: [],
    YOUNG_PLAYER: [],
    EMERGING_PLAYER: [],
  };
  for (const row of rows) {
    if (!row.playerId) continue;
    const list = idsByCategory[row.category as (typeof PLAYER_CATEGORIES)[number]];
    if (list && list.length < 3) list.push(row.playerId);
  }

  const allIds = Object.values(idsByCategory).flat();
  const players = allIds.length
    ? await prisma.player.findMany({
        where: { id: { in: allIds } },
        include: { currentTeam: true },
      })
    : [];
  const playerById = new Map(players.map((player) => [player.id, player]));

  function toOptions(ids: string[]): PlayerOption[] {
    return ids
      .map((id) => playerById.get(id))
      .filter((player): player is NonNullable<typeof player> => Boolean(player))
      .map((player) => ({
        id: player.id,
        name: player.name,
        teamName: player.currentTeam?.name ?? null,
        crestUrl: player.currentTeam?.crestUrl ?? null,
      }));
  }

  return {
    goldenBoot: toOptions(idsByCategory.GOLDEN_BOOT),
    mostAssists: toOptions(idsByCategory.MOST_ASSISTS),
    youngPlayer: toOptions(idsByCategory.YOUNG_PLAYER),
    emergingPlayer: toOptions(idsByCategory.EMERGING_PLAYER),
  };
}
