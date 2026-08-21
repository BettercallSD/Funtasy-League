import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { JoinByCodeForm } from "@/components/join-by-code-form";

export default async function FriendLeaguesPage() {
  const session = await requireUser("/friend-leagues");

  const memberships = await prisma.friendLeagueMember.findMany({
    where: { userId: session.user.id },
    include: { friendLeague: { include: { _count: { select: { members: true } } } } },
    orderBy: { joinedAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">My friend leagues</h1>
        <Link
          href="/friend-leagues/new"
          className="font-display bg-bk-text text-bk-bg rounded-full px-4 py-2 text-sm font-semibold"
        >
          + Create
        </Link>
      </div>

      <div className="mt-6">
        <JoinByCodeForm />
      </div>

      {memberships.length === 0 ? (
        <p className="text-bk-text-secondary mt-6">
          You&apos;re not in any friend leagues yet — create one or ask a friend for their invite
          link.
        </p>
      ) : (
        <ul className="border-bk-border divide-bk-border mt-6 divide-y rounded-lg border">
          {memberships.map((membership) => (
            <li key={membership.friendLeague.id}>
              <Link
                href={`/friend-leagues/${membership.friendLeague.id}`}
                className="hover:bg-bk-surface-raised flex items-center justify-between p-4"
              >
                <span className="font-display font-semibold">{membership.friendLeague.name}</span>
                <span className="text-bk-text-secondary text-xs">
                  {membership.friendLeague._count.members} member
                  {membership.friendLeague._count.members === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
