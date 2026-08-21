"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrThrow } from "@/lib/parse-or-throw";
import { usernameSchema } from "@/lib/validation/username";
import { getCurrentSeasonYear } from "@/lib/current-season-year";

export async function setUsername(username: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to set a username.");
  }

  const value = parseOrThrow(usernameSchema, username);

  // One username change per season-year overall (every league's current
  // season year counts as one shared cycle) — not deadline-gated, just
  // capped at one use. currentYear is null when every season is finalized
  // (or none exist), in which case there's no cycle to cap against.
  const currentYear = await getCurrentSeasonYear();
  if (currentYear !== null) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.usernameChangedForYear === currentYear) {
      throw new Error(
        "You've already changed your username this season — you can change it again once next season starts.",
      );
    }
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
      data: {
        username: value,
        ...(currentYear !== null ? { usernameChangedForYear: currentYear } : {}),
      },
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
