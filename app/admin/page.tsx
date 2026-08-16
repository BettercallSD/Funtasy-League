import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { LEAGUES, LEAGUE_ACCENT_CLASSES } from "@/lib/leagues";

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="font-display text-2xl font-bold">Admin</h1>
      <p className="text-bk-text-secondary mt-1">Pick a league to manage its seasons.</p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {LEAGUES.map((league) => {
          const accent = LEAGUE_ACCENT_CLASSES[league.slug];
          return (
            <li key={league.slug}>
              <Link
                href={`/admin/leagues/${league.slug}`}
                className={`bg-bk-surface hover:bg-bk-surface-raised block rounded-lg border-l-4 p-4 transition-colors ${accent.border}`}
              >
                <span className="font-display text-lg font-semibold">{league.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
