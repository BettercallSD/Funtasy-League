"use client";

import { useState, useTransition } from "react";
import { syncStandingsNow, type SyncNowResult } from "@/lib/actions/sync-actions";
import type { SyncResult } from "@/lib/sync-standings";

function ResultList({ title, results }: { title: string; results: SyncResult[] }) {
  return (
    <div>
      <p className="text-bk-text-secondary text-xs font-semibold tracking-wide uppercase">
        {title}
      </p>
      <ul className="text-bk-text-secondary mt-1 space-y-1 text-sm">
        {results.map((result) => (
          <li key={result.leagueSlug}>
            {result.leagueSlug}: {result.status}
            {result.message ? ` — ${result.message}` : ""}
          </li>
        ))}
        {results.length === 0 && <li>No active seasons to sync.</li>}
      </ul>
    </div>
  );
}

export function SyncStandingsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncNowResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const outcome = await syncStandingsNow();
        setResult(outcome);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="border-bk-border rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {isPending ? "Syncing…" : "Sync standings + players now"}
      </button>
      {error && <p className="text-bk-bundesliga mt-2 text-sm">{error}</p>}
      {result && (
        <div className="mt-2 space-y-3">
          <ResultList title="Players" results={result.players} />
          <ResultList title="Standings" results={result.standings} />
        </div>
      )}
    </div>
  );
}
