"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Attaches a guest Prediction to the signed-in user's profile as personal
// history only — never sets userId (that's reserved for real, competitive
// predictions), so this can never leak into any leaderboard or scoring
// aggregate, all of which filter on isGuest, not on claimedByUserId.
export async function claimGuestPrediction(guestToken: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in to claim a prediction.");
  }
  const userId = session.user.id;

  // Cap: one claimable guest prediction per account, ever. The @unique on
  // Prediction.claimedByUserId backstops this at the DB level too.
  const existingClaim = await prisma.prediction.findUnique({ where: { claimedByUserId: userId } });
  if (existingClaim) {
    throw new Error("You've already claimed a guest prediction — only one is allowed per account.");
  }

  const prediction = await prisma.prediction.findUnique({ where: { guestToken } });
  if (!prediction || !prediction.isGuest) {
    throw new Error("Guest prediction not found.");
  }
  if (prediction.claimed) {
    throw new Error("This guest prediction has already been claimed.");
  }

  await prisma.prediction.update({
    where: { id: prediction.id },
    data: { claimed: true, claimedByUserId: userId, claimedAt: new Date() },
  });

  revalidatePath(`/guest/result/${guestToken}`);
  revalidatePath("/me");
}
