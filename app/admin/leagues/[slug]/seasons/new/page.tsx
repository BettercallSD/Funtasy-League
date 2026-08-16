import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/require-admin";
import { getLeague } from "@/lib/leagues";
import { createSeason } from "@/lib/actions/admin-actions";
import { SeasonFields } from "@/components/admin/season-fields";

export default async function NewSeasonPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const league = getLeague(slug);
  if (!league) notFound();

  const action = createSeason.bind(null, slug);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="font-display text-2xl font-bold">New {league.name} season</h1>
      <form action={action} className="mt-6 space-y-4">
        <SeasonFields />
        <button
          type="submit"
          className="bg-bk-text text-bk-bg rounded-full px-5 py-2 text-sm font-semibold"
        >
          Create season
        </button>
      </form>
    </main>
  );
}
