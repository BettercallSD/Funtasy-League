"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAge } from "@/lib/player-age";
import { AwardCategory } from "@/lib/generated/prisma/enums";

const PLAYER_CATEGORIES = new Set<AwardCategory>([
  AwardCategory.GOLDEN_BOOT,
  AwardCategory.MOST_ASSISTS,
  AwardCategory.YOUNG_PLAYER,
  AwardCategory.EMERGING_PLAYER,
]);
const TEAM_CATEGORIES = new Set<AwardCategory>([
  AwardCategory.SURPRISE_TEAM,
  AwardCategory.DISAPPOINTING_TEAM,
]);

const setAwardSchema = z.object({
  seasonId: z.string().min(1),
  category: z.enum(AwardCategory),
  valueId: z.string().min(1),
});

async function getSessionUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to predict.");
  }
  return session.user.id;
}

export async function setAward(seasonId: string, category: AwardCategory, valueId: string) {
  const values = setAwardSchema.parse({ seasonId, category, valueId });
  const userId = await getSessionUserId();

  const season = await prisma.season.findUnique({
    where: { id: values.seasonId },
    include: { league: true },
  });
  if (!season) throw new Error("Season not found.");

  if (new Date() >= season.predictionLockAt) {
    throw new Error("Predictions are closed for this season.");
  }

  const existingPrediction = await prisma.prediction.findUnique({
    where: { userId_seasonId: { userId, seasonId: values.seasonId } },
  });
  if (existingPrediction?.lockedAt) {
    throw new Error("This prediction is already locked in and can't be edited.");
  }

  let data: { playerId: string | null; teamId: string | null };

  if (PLAYER_CATEGORIES.has(values.category)) {
    const player = await prisma.player.findUnique({ where: { id: values.valueId } });
    if (!player) throw new Error("Player not found.");

    // The player has to actually play for a team in this season's league —
    // otherwise nothing stops picking, say, a La Liga player for a Premier
    // League Golden Boot prediction.
    const playsInThisSeason =
      player.currentTeamId !== null &&
      (await prisma.seasonTeam.findUnique({
        where: { seasonId_teamId: { seasonId: values.seasonId, teamId: player.currentTeamId } },
      })) !== null;
    if (!playsInThisSeason) {
      throw new Error("That player isn't in this season's league.");
    }

    if (values.category === AwardCategory.EMERGING_PLAYER && getAge(player.dateOfBirth) >= 23) {
      throw new Error("Emerging Player must be under 23.");
    }
    data = { playerId: player.id, teamId: null };
  } else if (TEAM_CATEGORIES.has(values.category)) {
    const seasonTeam = await prisma.seasonTeam.findUnique({
      where: { seasonId_teamId: { seasonId: values.seasonId, teamId: values.valueId } },
    });
    if (!seasonTeam) throw new Error("Team not found in this season.");
    data = { playerId: null, teamId: seasonTeam.teamId };
  } else {
    throw new Error("Unknown award category.");
  }

  const prediction = await prisma.prediction.upsert({
    where: { userId_seasonId: { userId, seasonId: values.seasonId } },
    update: {},
    create: { userId, seasonId: values.seasonId, isGuest: false },
  });

  await prisma.predictionAward.upsert({
    where: { predictionId_category: { predictionId: prediction.id, category: values.category } },
    update: data,
    create: { predictionId: prediction.id, category: values.category, ...data },
  });

  revalidatePath(`/predict/${season.league.slug}`);
}
