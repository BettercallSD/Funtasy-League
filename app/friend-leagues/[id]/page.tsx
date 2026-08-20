import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { formatSeasonYear } from "@/lib/format-season";
import { getFriendLeagueScores } from "@/lib/friend-league-leaderboard";
import { computeRanks } from "@/lib/rank-predictions";
import { getMedalEmoji } from "@/lib/medals";
import { removeMember, regenerateInviteCode } from "@/lib/actions/friend-league-actions";

export default async function FriendLeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireUser(`/friend-leagues/${id}`);

  const friendLeague = await prisma.friendLeague.findUnique({
    where: { id },
    include: {
      seasons: { include: { season: { include: { league: true } } } },
      members: { include: { user: true } },
    },
  });
  if (!friendLeague) notFound();

  // Private league — only members (not just anyone with the internal id)
  // can see it. Sharing happens through the invite code, not this URL.
  const isMember = friendLeague.members.some((member) => member.userId === session.user.id);
  if (!isMember) notFound();

  const isCreator = friendLeague.creatorId === session.user.id;

  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const inviteUrl = `${protocol}://${host}/join/${friendLeague.inviteCode}`;

  const scores = await getFriendLeagueScores(friendLeague.id);
  const ranked = computeRanks(
    scores.map((memberScore) => ({
      ...memberScore,
      score: memberScore.totalScore,
      exactBonusCount: memberScore.totalExactBonusCount,
    })),
  );

  const scopeLabel = friendLeague.seasons
    .map(
      (friendLeagueSeason) =>
        `${friendLeagueSeason.season.league.name} ${formatSeasonYear(friendLeagueSeason.season.year)}`,
    )
    .join(", ");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="font-display text-2xl font-bold">{friendLeague.name}</h1>
      <p className="text-bk-text-secondary mt-1 text-sm">Scoped to: {scopeLabel}</p>

      {isCreator && (
        <div className="border-bk-border bg-bk-surface mt-6 rounded-lg border p-4">
          <p className="text-bk-text-secondary text-xs font-semibold tracking-wide uppercase">
            Invite link
          </p>
          <p className="font-display mt-1 text-sm break-all">{inviteUrl}</p>
          <form action={regenerateInviteCode.bind(null, friendLeague.id)} className="mt-2">
            <button
              type="submit"
              className="border-bk-border rounded-full border px-3 py-1 text-xs font-semibold"
            >
              Regenerate link
            </button>
          </form>
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Leaderboard</h2>
          <Link
            href={`/friend-leagues/${friendLeague.id}/recap`}
            className="font-display text-bk-text-secondary hover:text-bk-text text-sm font-semibold"
          >
            🏆 My recap
          </Link>
        </div>
        <div className="border-bk-border mt-3 overflow-hidden rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-bk-surface text-bk-text-secondary text-left text-xs tracking-wide uppercase">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-bk-border divide-y">
              {ranked.map((entry) => (
                <tr key={entry.userId} className="bg-bk-surface">
                  <td className="font-display px-4 py-3 tabular-nums">
                    {getMedalEmoji(entry.rank) ?? entry.rank}
                  </td>
                  <td className="px-4 py-3">{entry.userName}</td>
                  <td className="font-display px-4 py-3 text-right font-semibold tabular-nums">
                    {entry.totalScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">
          Members ({friendLeague.members.length}/{friendLeague.maxMembers})
        </h2>
        <ul className="border-bk-border divide-bk-border mt-3 divide-y rounded-lg border">
          {friendLeague.members.map((member) => (
            <li key={member.id} className="flex items-center justify-between p-3 text-sm">
              <span>
                {member.user.name}
                {member.userId === friendLeague.creatorId && (
                  <span className="text-bk-text-secondary ml-2 text-xs">Creator</span>
                )}
              </span>
              {isCreator && member.userId !== friendLeague.creatorId && (
                <form action={removeMember.bind(null, friendLeague.id, member.userId)}>
                  <button
                    type="submit"
                    className="text-xs font-semibold text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
