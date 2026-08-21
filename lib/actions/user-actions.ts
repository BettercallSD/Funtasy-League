"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrThrow } from "@/lib/parse-or-throw";
import { usernameSchema } from "@/lib/validation/username";

export async function setUsername(username: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to set a username.");
  }

  const value = parseOrThrow(usernameSchema, username);

  // Changing your username while you're actively competing in a season
  // (locked in, not yet finalized) would confuse anyone looking at that
  // season's leaderboard mid-competition — so it's only allowed before a
  // season you've entered starts, or after it's finalized. Scoped to
  // seasons this user actually has a real (non-guest) prediction in, not
  // every season globally — a season you've never touched shouldn't block
  // you just because it happens to be in progress.
  const inProgressPrediction = await prisma.prediction.findFirst({
    where: {
      userId: session.user.id,
      isGuest: false,
      season: { status: { not: "FINALIZED" }, predictionLockAt: { lte: new Date() } },
    },
  });
  if (inProgressPrediction) {
    throw new Error(
      "You can't change your username while a season you've entered is in progress — you'll be able to again once it's finalized.",
    );
  }

  // Case-insensitive check up front for a friendly error message — the
  // column's unique constraint is the real, race-condition-proof guarantee,
  // caught below as a fallback.
  const existing = await prisma.user.findFirst({
    where: { username: { equals: value, mode: "insensitive" }, id: { not: session.user.id } },
  });
  if (existing) {
    throw new Error("That username is already taken.");
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { username: value },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new Error("That username is already taken.");
    }
    throw error;
  }

  revalidatePath("/me");
}
