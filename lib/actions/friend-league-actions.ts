"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrThrow } from "@/lib/parse-or-throw";
import { createFriendLeagueSchema } from "@/lib/validation/friend-league";
import { generateUniqueInviteCode } from "@/lib/invite-code";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";

async function getSessionUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be signed in.");
  }
  return session.user.id;
}

export async function createFriendLeague(formData: FormData) {
  const userId = await getSessionUserId();

  const values = parseOrThrow(createFriendLeagueSchema, {
    name: formData.get("name"),
    maxMembers: formData.get("maxMembers"),
    seasonIds: formData.getAll("seasonIds"),
  });

  const validSeasonCount = await prisma.season.count({ where: { id: { in: values.seasonIds } } });
  if (validSeasonCount !== new Set(values.seasonIds).size) {
    throw new Error("One of the selected seasons doesn't exist.");
  }

  const inviteCode = await generateUniqueInviteCode();

  const friendLeague = await prisma.friendLeague.create({
    data: {
      creatorId: userId,
      name: values.name,
      maxMembers: values.maxMembers,
      inviteCode,
      seasons: { create: values.seasonIds.map((seasonId) => ({ seasonId })) },
      members: { create: { userId } },
    },
  });

  revalidatePath("/friend-leagues");
  redirect(`/friend-leagues/${friendLeague.id}`);
}

export async function joinFriendLeague(inviteCode: string) {
  const userId = await getSessionUserId();

  // Friend-league join is one of the four endpoints CLAUDE.md explicitly
  // calls out for rate limiting (anonymous/low-friction abuse surface).
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`friend-league-join:${ip}`, 10, 10 * 60 * 1000);
  if (!allowed) {
    throw new Error("Too many join attempts — try again in a few minutes.");
  }

  const friendLeague = await prisma.friendLeague.findUnique({
    where: { inviteCode },
    include: { _count: { select: { members: true } } },
  });
  if (!friendLeague) {
    throw new Error("That invite link isn't valid — it may have been regenerated.");
  }

  const alreadyMember = await prisma.friendLeagueMember.findUnique({
    where: { friendLeagueId_userId: { friendLeagueId: friendLeague.id, userId } },
  });
  if (alreadyMember) {
    redirect(`/friend-leagues/${friendLeague.id}`);
  }

  if (friendLeague._count.members >= friendLeague.maxMembers) {
    throw new Error("This friend league is full.");
  }

  await prisma.friendLeagueMember.create({
    data: { friendLeagueId: friendLeague.id, userId },
  });

  revalidatePath(`/friend-leagues/${friendLeague.id}`);
  redirect(`/friend-leagues/${friendLeague.id}`);
}

export async function removeMember(friendLeagueId: string, memberUserId: string) {
  const userId = await getSessionUserId();

  const friendLeague = await prisma.friendLeague.findUnique({ where: { id: friendLeagueId } });
  if (!friendLeague) throw new Error("Friend league not found.");
  if (friendLeague.creatorId !== userId) {
    throw new Error("Only the creator can remove members.");
  }
  if (memberUserId === userId) {
    throw new Error("The creator can't remove themselves — delete the league instead.");
  }

  await prisma.friendLeagueMember.deleteMany({
    where: { friendLeagueId, userId: memberUserId },
  });

  revalidatePath(`/friend-leagues/${friendLeagueId}`);
}

export async function regenerateInviteCode(friendLeagueId: string) {
  const userId = await getSessionUserId();

  const friendLeague = await prisma.friendLeague.findUnique({ where: { id: friendLeagueId } });
  if (!friendLeague) throw new Error("Friend league not found.");
  if (friendLeague.creatorId !== userId) {
    throw new Error("Only the creator can regenerate the invite link.");
  }

  const inviteCode = await generateUniqueInviteCode();
  await prisma.friendLeague.update({ where: { id: friendLeagueId }, data: { inviteCode } });

  revalidatePath(`/friend-leagues/${friendLeagueId}`);
}
