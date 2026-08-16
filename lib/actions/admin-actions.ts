"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import {
  seasonFormSchema,
  seasonTeamFormSchema,
  finalizeSeasonSchema,
} from "@/lib/validation/season";
import { AwardCategory } from "@/lib/generated/prisma/enums";

async function getLeagueBySlugOrNotFound(slug: string) {
  const league = await prisma.league.findUnique({ where: { slug } });
  if (!league) notFound();
  return league;
}

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid input");
  }
  return result.data;
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

  const awardEntries: {
    category: AwardCategory;
    playerId?: string;
    teamId?: string;
  }[] = [
    { category: AwardCategory.GOLDEN_BOOT, playerId: values.goldenBootPlayerId },
    { category: AwardCategory.MOST_ASSISTS, playerId: values.mostAssistsPlayerId },
    { category: AwardCategory.YOUNG_PLAYER, playerId: values.youngPlayerPlayerId },
    { category: AwardCategory.EMERGING_PLAYER, playerId: values.emergingPlayerPlayerId },
    { category: AwardCategory.SURPRISE_TEAM, teamId: values.surpriseTeamId },
    { category: AwardCategory.DISAPPOINTING_TEAM, teamId: values.disappointingTeamId },
  ].filter((entry) => entry.playerId || entry.teamId);

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
        })),
      });
    }

    await tx.season.update({ where: { id: seasonId }, data: { status: "FINALIZED" } });
  });

  revalidatePath(`/admin/leagues/${leagueSlug}/seasons/${seasonId}`);
  redirect(`/admin/leagues/${leagueSlug}/seasons/${seasonId}`);
}
