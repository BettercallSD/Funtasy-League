import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { formatSeasonYear } from "@/lib/format-season";
import { joinFriendLeague } from "@/lib/actions/friend-league-actions";

export default async function JoinFriendLeaguePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await requireUser(`/join/${code}`);

  const friendLeague = await prisma.friendLeague.findUnique({
    where: { inviteCode: code },
    include: {
      seasons: { include: { season: { include: { league: true } } } },
      _count: { select: { members: true } },
      members: { where: { userId: session.user.id } },
    },
  });
  if (!friendLeague) notFound();

  const isAlreadyMember = friendLeague.members.length > 0;

  const action = joinFriendLeague.bind(null, code);
  const scopeLabel = friendLeague.seasons
    .map(
      (friendLeagueSeason) =>
        `${friendLeagueSeason.season.league.name} ${formatSeasonYear(friendLeagueSeason.season.year)}`,
    )
    .join(", ");

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-12 text-center">
      <h1 className="font-display text-2xl font-bold">{friendLeague.name}</h1>
      <p className="text-bk-text-secondary mt-2 text-sm">Scoped to: {scopeLabel}</p>
      <p className="text-bk-text-secondary mt-1 text-xs">
        {friendLeague._count.members} member
        {friendLeague._count.members === 1 ? "" : "s"}
      </p>

      {isAlreadyMember ? (
        <p className="text-bk-text-secondary mt-6 text-sm">You&apos;re already in this league.</p>
      ) : (
        <form action={action} className="mt-6">
          <button
            type="submit"
            className="font-display bg-bk-text text-bk-bg rounded-full px-5 py-2 text-sm font-semibold"
          >
            Join league
          </button>
        </form>
      )}

      {isAlreadyMember && (
        <Link
          href={`/friend-leagues/${friendLeague.id}`}
          className="text-bk-text-secondary mt-4 inline-block text-sm underline"
        >
          Go to league
        </Link>
      )}
    </main>
  );
}
