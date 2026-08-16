import { notFound } from "next/navigation";
import { getLeague } from "@/lib/leagues";
import { requireUser } from "@/lib/require-user";

export default async function PredictPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = getLeague(slug);
  if (!league) notFound();

  const session = await requireUser(`/predict/${slug}`);

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Predict the {league.name} table</h1>
      <p className="text-bk-text-secondary mt-2">
        Signed in as {session.user.name}. The real drag-and-drop predictor lands in Phase 3 — this
        page exists to prove the sign-in gate works end to end.
      </p>
    </main>
  );
}
