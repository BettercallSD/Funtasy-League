"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseOrThrow } from "@/lib/parse-or-throw";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { computeSubmittedLabel } from "@/lib/submitted-label";
import { getAge } from "@/lib/player-age";
import { guestPredictionSchema } from "@/lib/validation/guest-prediction";
import { AwardCategory } from "@/lib/generated/prisma/enums";

// The whole guest board (table order + all award picks) is collected in
// local client state and submitted in one shot here — that's the
// "submission" CLAUDE.md gates on Turnstile, rather than persisting on every
// drag/pick the way the authenticated flow does.
export async function submitGuestPrediction(input: unknown) {
  const values = parseOrThrow(guestPredictionSchema, input);

  // Guest prediction submission is one of the four endpoints CLAUDE.md
  // explicitly calls out for IP rate limiting.
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`guest-prediction:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    throw new Error("Too many guest predictions from this network — try again in a bit.");
  }

  const verified = await verifyTurnstileToken(values.turnstileToken, ip);
  if (!verified) {
    throw new Error("Verification failed — please try again.");
  }

  const season = await prisma.season.findUnique({
    where: { id: values.seasonId },
    include: { seasonTeams: true },
  });
  if (!season) throw new Error("Season not found.");

  const validTeamIds = new Set(season.seasonTeams.map((seasonTeam) => seasonTeam.teamId));
  if (values.teamIds.length !== season.teamCount) {
    throw new Error("Prediction must include every team in the season, exactly once.");
  }
  if (new Set(values.teamIds).size !== values.teamIds.length) {
    throw new Error("Prediction contains a duplicate team.");
  }
  for (const teamId of values.teamIds) {
    if (!validTeamIds.has(teamId)) {
      throw new Error("Prediction includes a team that isn't in this season.");
    }
  }

  const awardEntries: { category: AwardCategory; playerId?: string; teamId?: string }[] = [
    { category: AwardCategory.GOLDEN_BOOT, playerId: values.goldenBootPlayerId },
    { category: AwardCategory.MOST_ASSISTS, playerId: values.mostAssistsPlayerId },
    { category: AwardCategory.YOUNG_PLAYER, playerId: values.youngPlayerPlayerId },
    { category: AwardCategory.EMERGING_PLAYER, playerId: values.emergingPlayerPlayerId },
    { category: AwardCategory.SURPRISE_TEAM, teamId: values.surpriseTeamId },
    { category: AwardCategory.DISAPPOINTING_TEAM, teamId: values.disappointingTeamId },
  ].filter((entry) => entry.playerId || entry.teamId);

  const awardPlayerIds = awardEntries
    .map((entry) => entry.playerId)
    .filter((id): id is string => Boolean(id));
  if (awardPlayerIds.length > 0) {
    const validPlayerCount = await prisma.player.count({
      where: { id: { in: awardPlayerIds }, currentTeamId: { in: [...validTeamIds] } },
    });
    if (validPlayerCount !== new Set(awardPlayerIds).size) {
      throw new Error("One of the selected award players isn't in this season's league.");
    }
  }
  if (values.youngPlayerPlayerId) {
    const player = await prisma.player.findUnique({ where: { id: values.youngPlayerPlayerId } });
    if (!player || getAge(player.dateOfBirth) >= 23) {
      throw new Error("Young Player of the Season must be under 23.");
    }
  }
  const awardTeamIds = awardEntries
    .map((entry) => entry.teamId)
    .filter((id): id is string => Boolean(id));
  for (const teamId of awardTeamIds) {
    if (!validTeamIds.has(teamId)) {
      throw new Error("One of the selected award teams isn't in this season.");
    }
  }

  const guestToken = randomBytes(24).toString("base64url");
  const submittedLabel = computeSubmittedLabel(season);

  await prisma.prediction.create({
    data: {
      seasonId: values.seasonId,
      isGuest: true,
      guestToken,
      lockedAt: new Date(),
      submittedLabel,
      tableEntries: {
        create: values.teamIds.map((teamId, index) => ({
          teamId,
          predictedPosition: index + 1,
        })),
      },
      awards: {
        create: awardEntries.map((entry) => ({
          category: entry.category,
          playerId: entry.playerId,
          teamId: entry.teamId,
        })),
      },
    },
  });

  redirect(`/guest/result/${guestToken}`);
}
