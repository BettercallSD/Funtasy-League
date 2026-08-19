"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { parseOrThrow } from "@/lib/parse-or-throw";
import {
  seasonFormSchema,
  seasonTeamFormSchema,
  finalizeSeasonSchema,
} from "@/lib/validation/season";
import { AwardCategory } from "@/lib/generated/prisma/enums";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  getAveragePredictedPositions,
  pickSurpriseAndDisappointingTeam,
} from "@/lib/surprise-disappointing";
import { scorePrediction, type ScoringConfig, type TableAndAwards } from "@/lib/scoring";

async function getLeagueBySlugOrNotFound(slug: string) {
  const league = await prisma.league.findUnique({ where: { slug } });
  if (!league) notFound();
  return league;
}

export async function createSeason(leagueSlug: string, formData: FormData) {
  await requireAdmin();
  const league = await getLeagueBySlugOrNotFound(leagueSlug);

  const values = parseOrThrow(seasonFormSchema, {
    year: formData.get("year"),
    teamCount: formData.get("teamCount"),
    directRelegationCount: formData.get("directRelegationCount"),
    playoffRelegationCount: formData.get("playoffRelegationCount"),
    championsLeagueSlots: formData.get("championsLeagueSlots"),
    europaLeagueSlots: formData.get("europaLeagueSlots"),
    conferenceLeagueSlots: formData.get("conferenceLeagueSlots"),
    predictionLockAt: formData.get("predictionLockAt"),
  });

  const season = await prisma.season.create({
    data: { leagueId: league.id, ...values },
  });

  revalidatePath(`/admin/leagues/${leagueSlug}`);
  redirect(`/admin/leagues/${leagueSlug}/seasons/${season.id}`);
}

export async function updateSeason(seasonId: string, leagueSlug: string, formData: FormData) {
  await requireAdmin();

  const values = parseOrThrow(seasonFormSchema, {
    year: formData.get("year"),
    teamCount: formData.get("teamCount"),
    directRelegationCount: formData.get("directRelegationCount"),
    playoffRelegationCount: formData.get("playoffRelegationCount"),
    championsLeagueSlots: formData.get("championsLeagueSlots"),
    europaLeagueSlots: formData.get("europaLeagueSlots"),
    conferenceLeagueSlots: formData.get("conferenceLeagueSlots"),
    predictionLockAt: formData.get("predictionLockAt"),
  });

  await prisma.season.update({ where: { id: seasonId }, data: values });

  revalidatePath(`/admin/leagues/${leagueSlug}/seasons/${seasonId}`);
}

export async function addSeasonTeam(seasonId: string, leagueSlug: string, formData: FormData) {
  await requireAdmin();

  const values = parseOrThrow(seasonTeamFormSchema, {
    name: formData.get("name"),
    shortName: formData.get("shortName") ?? "",
    crestUrl: formData.get("crestUrl") ?? "",
    promoted: formData.get("promoted") === "on",
    relegated: formData.get("relegated") === "on",
  });

  const team = await prisma.team.upsert({
    where: { name: values.name },
    update: { shortName: values.shortName, crestUrl: values.crestUrl },
    create: { name: values.name, shortName: values.shortName, crestUrl: values.crestUrl },
  });

  await prisma.seasonTeam.upsert({
    where: { seasonId_teamId: { seasonId, teamId: team.id } },
    update: { promoted: values.promoted, relegated: values.relegated },
    create: {
      seasonId,
      teamId: team.id,
      promoted: values.promoted,
      relegated: values.relegated,
    },
  });

  revalidatePath(`/admin/leagues/${leagueSlug}/seasons/${seasonId}`);
}

export async function updateSeasonTeam(
  seasonTeamId: string,
  leagueSlug: string,
  seasonId: string,
  formData: FormData,
) {
  await requireAdmin();

  const values = parseOrThrow(seasonTeamFormSchema, {
    name: formData.get("name"),
    shortName: formData.get("shortName") ?? "",
    crestUrl: formData.get("crestUrl") ?? "",
    promoted: formData.get("promoted") === "on",
    relegated: formData.get("relegated") === "on",
  });

  const seasonTeam = await prisma.seasonTeam.findUnique({ where: { id: seasonTeamId } });
  if (!seasonTeam) notFound();

  await prisma.team.update({
    where: { id: seasonTeam.teamId },
    data: { name: values.name, shortName: values.shortName, crestUrl: values.crestUrl },
  });

  await prisma.seasonTeam.update({
    where: { id: seasonTeamId },
    data: { promoted: values.promoted, relegated: values.relegated },
  });

  revalidatePath(`/admin/leagues/${leagueSlug}/seasons/${seasonId}`);
}

export async function removeSeasonTeam(seasonTeamId: string, leagueSlug: string, seasonId: string) {
  await requireAdmin();
  await prisma.seasonTeam.delete({ where: { id: seasonTeamId } });
  revalidatePath(`/admin/leagues/${leagueSlug}/seasons/${seasonId}`);
}

export async function finalizeSeason(seasonId: string, leagueSlug: string, formData: FormData) {
  const admin = await requireAdmin();

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: { seasonTeams: { include: { team: true } } },
  });
  if (!season) notFound();

  const tableEntries = season.seasonTeams.map(({ teamId }) => ({
    teamId,
    finalPosition: Number(formData.get(`position_${teamId}`)),
  }));

  const readOptional = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.length > 0 ? value : undefined;
  };

  const values = parseOrThrow(finalizeSeasonSchema, {
    tableEntries,
    goldenBootPlayerId: readOptional("goldenBootPlayerId"),
    mostAssistsPlayerId: readOptional("mostAssistsPlayerId"),
    youngPlayerPlayerId: readOptional("youngPlayerPlayerId"),
    emergingPlayerPlayerId: readOptional("emergingPlayerPlayerId"),
    surpriseTeamId: readOptional("surpriseTeamId"),
    disappointingTeamId: readOptional("disappointingTeamId"),
  });

  const positions = values.tableEntries.map((e) => e.finalPosition).sort((a, b) => a - b);
  const expected = Array.from({ length: season.teamCount }, (_, i) => i + 1);
  const isValidPermutation =
    positions.length === expected.length && positions.every((p, i) => p === expected[i]);
  if (!isValidPermutation) {
    throw new Error(
      `Final positions must be a complete 1–${season.teamCount} ranking with no repeats or gaps`,
    );
  }

  const seasonTeamIds = season.seasonTeams.map((seasonTeam) => seasonTeam.teamId);
  const actualPositionByTeamId = new Map(
    values.tableEntries.map((entry) => [entry.teamId, entry.finalPosition]),
  );

  // Surprise/Disappointing Team: an admin-picked team is a manual override;
  // otherwise auto-calculate from the community's average predicted position
  // vs. the actual result (CLAUDE.md). Either way, show the "Community
  // expected Xth, finished Yth" math for whichever team ends up chosen.
  const averageByTeamId = await getAveragePredictedPositions(seasonId);
  const auto = pickSurpriseAndDisappointingTeam(averageByTeamId, actualPositionByTeamId);
  const surpriseTeamId = values.surpriseTeamId ?? auto.surpriseTeamId ?? undefined;
  const surpriseIsManual = Boolean(values.surpriseTeamId);
  const disappointingTeamId = values.disappointingTeamId ?? auto.disappointingTeamId ?? undefined;
  const disappointingIsManual = Boolean(values.disappointingTeamId);

  function statsFor(teamId: string | undefined) {
    if (!teamId) return { averagePredictedPosition: undefined, actualPosition: undefined };
    return {
      averagePredictedPosition: averageByTeamId.get(teamId)?.averagePredictedPosition,
      actualPosition: actualPositionByTeamId.get(teamId),
    };
  }
  const surpriseStats = statsFor(surpriseTeamId);
  const disappointingStats = statsFor(disappointingTeamId);

  const awardEntries: {
    category: AwardCategory;
    playerId?: string;
    teamId?: string;
    averagePredictedPosition?: number;
    actualPosition?: number;
    isManualOverride?: boolean;
  }[] = [
    { category: AwardCategory.GOLDEN_BOOT, playerId: values.goldenBootPlayerId },
    { category: AwardCategory.MOST_ASSISTS, playerId: values.mostAssistsPlayerId },
    { category: AwardCategory.YOUNG_PLAYER, playerId: values.youngPlayerPlayerId },
    { category: AwardCategory.EMERGING_PLAYER, playerId: values.emergingPlayerPlayerId },
    {
      category: AwardCategory.SURPRISE_TEAM,
      teamId: surpriseTeamId,
      averagePredictedPosition: surpriseStats.averagePredictedPosition,
      actualPosition: surpriseStats.actualPosition,
      isManualOverride: surpriseIsManual,
    },
    {
      category: AwardCategory.DISAPPOINTING_TEAM,
      teamId: disappointingTeamId,
      averagePredictedPosition: disappointingStats.averagePredictedPosition,
      actualPosition: disappointingStats.actualPosition,
      isManualOverride: disappointingIsManual,
    },
  ].filter((entry) => entry.playerId || entry.teamId);

  const awardPlayerIds = awardEntries
    .map((entry) => entry.playerId)
    .filter((id): id is string => Boolean(id));
  if (awardPlayerIds.length > 0) {
    const validPlayerCount = await prisma.player.count({
      where: { id: { in: awardPlayerIds }, currentTeamId: { in: seasonTeamIds } },
    });
    if (validPlayerCount !== new Set(awardPlayerIds).size) {
      throw new Error("One of the selected award players isn't in this season's league.");
    }
  }
  const awardTeamIds = awardEntries
    .map((entry) => entry.teamId)
    .filter((id): id is string => Boolean(id));
  for (const teamId of awardTeamIds) {
    if (!seasonTeamIds.includes(teamId)) {
      throw new Error("One of the selected award teams isn't in this season.");
    }
  }

  await prisma.$transaction(async (tx) => {
    const seasonResult = await tx.seasonResult.upsert({
      where: { seasonId },
      update: { finalizedByUserId: admin.id, finalizedAt: new Date() },
      create: { seasonId, finalizedByUserId: admin.id },
    });

    await tx.seasonResultTableEntry.deleteMany({ where: { seasonResultId: seasonResult.id } });
    await tx.seasonResultTableEntry.createMany({
      data: values.tableEntries.map((entry) => ({
        seasonResultId: seasonResult.id,
        teamId: entry.teamId,
        finalPosition: entry.finalPosition,
      })),
    });

    await tx.seasonResultAward.deleteMany({ where: { seasonResultId: seasonResult.id } });
    if (awardEntries.length > 0) {
      await tx.seasonResultAward.createMany({
        data: awardEntries.map((entry) => ({
          seasonResultId: seasonResult.id,
          category: entry.category,
          playerId: entry.playerId,
          teamId: entry.teamId,
          averagePredictedPosition: entry.averagePredictedPosition,
          actualPosition: entry.actualPosition,
          isManualOverride: entry.isManualOverride ?? false,
        })),
      });
    }

    await tx.season.update({ where: { id: seasonId }, data: { status: "FINALIZED" } });
  });

  // Score every locked, non-guest prediction against the result just saved.
  const scoringConfig: ScoringConfig = {
    teamCount: season.teamCount,
    topBracketSize:
      season.championsLeagueSlots + season.europaLeagueSlots + season.conferenceLeagueSlots,
    relegationSize: season.directRelegationCount + season.playoffRelegationCount,
  };
  const truth: TableAndAwards = {
    positionByTeamId: actualPositionByTeamId,
    goldenBootPlayerId: values.goldenBootPlayerId ?? null,
    mostAssistsPlayerId: values.mostAssistsPlayerId ?? null,
    youngPlayerPlayerId: values.youngPlayerPlayerId ?? null,
    emergingPlayerPlayerId: values.emergingPlayerPlayerId ?? null,
    surpriseTeamId: surpriseTeamId ?? null,
    disappointingTeamId: disappointingTeamId ?? null,
  };

  const predictions = await prisma.prediction.findMany({
    where: { seasonId, isGuest: false, lockedAt: { not: null } },
    include: { tableEntries: true, awards: true },
  });

  for (const prediction of predictions) {
    const awardsByCategory = new Map(prediction.awards.map((award) => [award.category, award]));
    const predictionInput: TableAndAwards = {
      positionByTeamId: new Map(
        prediction.tableEntries.map((entry) => [entry.teamId, entry.predictedPosition]),
      ),
      goldenBootPlayerId: awardsByCategory.get(AwardCategory.GOLDEN_BOOT)?.playerId ?? null,
      mostAssistsPlayerId: awardsByCategory.get(AwardCategory.MOST_ASSISTS)?.playerId ?? null,
      youngPlayerPlayerId: awardsByCategory.get(AwardCategory.YOUNG_PLAYER)?.playerId ?? null,
      emergingPlayerPlayerId: awardsByCategory.get(AwardCategory.EMERGING_PLAYER)?.playerId ?? null,
      surpriseTeamId: awardsByCategory.get(AwardCategory.SURPRISE_TEAM)?.teamId ?? null,
      disappointingTeamId: awardsByCategory.get(AwardCategory.DISAPPOINTING_TEAM)?.teamId ?? null,
    };

    const breakdown = scorePrediction(scoringConfig, truth, predictionInput);

    await prisma.prediction.update({
      where: { id: prediction.id },
      data: {
        finalScore: breakdown.total,
        finalScoreBreakdown: breakdown as unknown as Prisma.InputJsonValue,
        finalExactBonusCount: breakdown.exactPositionBonusCount,
      },
    });
  }

  revalidatePath(`/admin/leagues/${leagueSlug}/seasons/${seasonId}`);
  revalidatePath(`/leagues/${leagueSlug}/leaderboard`);
  redirect(`/admin/leagues/${leagueSlug}/seasons/${seasonId}`);
}
