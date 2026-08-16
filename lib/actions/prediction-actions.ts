"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teamOrderSchema } from "@/lib/validation/prediction";

async function getSessionUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to predict.");
  }
  return session.user.id;
}

async function loadSeasonForWrite(seasonId: string) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { seasonTeams: true, league: true },
  });
  if (!season) {
    throw new Error("Season not found.");
  }
  return season;
}

// Beyond shape (validated by Zod before this runs): every team in the
// season must appear exactly once, and no unrelated team id can sneak in.
function assertCompleteAndValid(
  teamIds: string[],
  season: { seasonTeams: { teamId: string }[]; teamCount: number },
) {
  const validTeamIds = new Set(season.seasonTeams.map((seasonTeam) => seasonTeam.teamId));
  if (teamIds.length !== season.teamCount) {
    throw new Error("Prediction must include every team in the season, exactly once.");
  }
  if (new Set(teamIds).size !== teamIds.length) {
    throw new Error("Prediction contains a duplicate team.");
  }
  for (const teamId of teamIds) {
    if (!validTeamIds.has(teamId)) {
      throw new Error("Prediction includes a team that isn't in this season.");
    }
  }
}

async function upsertDraftEntries(userId: string, seasonId: string, teamIds: string[]) {
  const existing = await prisma.prediction.findUnique({
    where: { userId_seasonId: { userId, seasonId } },
  });
  if (existing?.lockedAt) {
    throw new Error("This prediction is already locked in and can't be edited.");
  }

  const prediction = await prisma.prediction.upsert({
    where: { userId_seasonId: { userId, seasonId } },
    update: {},
    create: { userId, seasonId, isGuest: false },
  });

  await prisma.$transaction([
    prisma.predictionTableEntry.deleteMany({ where: { predictionId: prediction.id } }),
    prisma.predictionTableEntry.createMany({
      data: teamIds.map((teamId, index) => ({
        predictionId: prediction.id,
        teamId,
        predictedPosition: index + 1,
      })),
    }),
  ]);

  return prediction;
}

export async function saveDraftPrediction(seasonId: string, teamIds: string[]) {
  const { seasonId: validSeasonId, teamIds: validTeamIds } = teamOrderSchema.parse({
    seasonId,
    teamIds,
  });

  const userId = await getSessionUserId();
  const season = await loadSeasonForWrite(validSeasonId);

  // The season's global deadline is the hard cutoff, enforced here
  // regardless of what the client's clock or UI state claims.
  if (new Date() >= season.predictionLockAt) {
    throw new Error("Predictions are closed for this season.");
  }

  assertCompleteAndValid(validTeamIds, season);
  await upsertDraftEntries(userId, validSeasonId, validTeamIds);

  revalidatePath(`/predict/${season.league.slug}`);
}

export async function lockInPrediction(seasonId: string, teamIds: string[]) {
  const { seasonId: validSeasonId, teamIds: validTeamIds } = teamOrderSchema.parse({
    seasonId,
    teamIds,
  });

  const userId = await getSessionUserId();
  const season = await loadSeasonForWrite(validSeasonId);

  if (new Date() >= season.predictionLockAt) {
    throw new Error("Predictions are closed for this season.");
  }

  assertCompleteAndValid(validTeamIds, season);
  const prediction = await upsertDraftEntries(userId, validSeasonId, validTeamIds);

  await prisma.prediction.update({
    where: { id: prediction.id },
    data: { lockedAt: new Date() },
  });

  revalidatePath(`/predict/${season.league.slug}`);
}
