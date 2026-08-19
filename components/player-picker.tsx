"use client";

import { useEffect, useState, useTransition } from "react";
import { setAward } from "@/lib/actions/award-actions";
import type { AwardCategory } from "@/lib/generated/prisma/enums";

export interface PlayerOption {
  id: string;
  name: string;
  teamName: string | null;
  crestUrl: string | null;
}

export function PlayerPicker({
  seasonId,
  category,
  label,
  u23Only,
  popularPlayers,
  selected,
  disabled,
  onSelect,
}: {
  seasonId: string;
  category: AwardCategory;
  label: string;
  u23Only?: boolean;
  popularPlayers: PlayerOption[];
  selected: PlayerOption | null;
  disabled: boolean;
  /** Controlled mode (e.g. guest predictions): report the pick instead of persisting it via setAward. */
  onSelect?: (player: PlayerOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState(selected);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length === 0) {
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setIsSearching(true);
      const params = new URLSearchParams({
        q: query,
        u23Only: String(Boolean(u23Only)),
        seasonId,
      });
      fetch(`/api/players/search?${params}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: PlayerOption[]) => setResults(data))
        .catch(() => {
          // aborted or network error — ignore, the next keystroke retries
        })
        .finally(() => setIsSearching(false));
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query, u23Only, seasonId]);

  // Derived rather than cleared inside the effect — an empty query has no
  // results to show regardless of what the last fetch left in state.
  const displayedResults = query.trim().length === 0 ? [] : results;

  function choose(player: PlayerOption) {
    setError(null);

    if (onSelect) {
      onSelect(player);
      setCurrent(player);
      setQuery("");
      setResults([]);
      return;
    }

    startTransition(async () => {
      try {
        await setAward(seasonId, category, player.id);
        setCurrent(player);
        setQuery("");
        setResults([]);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="border-bk-border rounded-lg border p-4">
      <h3 className="font-display text-sm font-semibold">{label}</h3>

      {current && (
        <div className="bg-bk-surface mt-2 flex items-center gap-2 rounded-md p-2">
          {current.crestUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary crest URLs, not in next/image's remote allowlist
            <img src={current.crestUrl} alt="" width={20} height={20} />
          )}
          <span className="flex-1 text-sm font-medium">{current.name}</span>
          {current.teamName && (
            <span className="text-bk-text-secondary text-xs">{current.teamName}</span>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={() => {
                setCurrent(null);
                onSelect?.(null);
              }}
              className="text-bk-text-secondary text-xs underline"
            >
              Change
            </button>
          )}
        </div>
      )}

      {!disabled && !current && (
        <>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Search players…"
            className="border-bk-border bg-bk-bg mt-2 w-full rounded-md border px-3 py-2 text-sm"
          />

          {isFocused && query.trim().length === 0 && popularPlayers.length > 0 && (
            <div className="mt-2">
              <p className="text-bk-text-muted text-xs">Popular picks among other predictors</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {popularPlayers.slice(0, 3).map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => choose(player)}
                    className="border-bk-border rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-50"
                  >
                    {player.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSearching && <p className="text-bk-text-secondary mt-1 text-xs">Searching…</p>}

          {displayedResults.length > 0 && (
            <ul className="border-bk-border divide-bk-border mt-1 divide-y rounded-md border">
              {displayedResults.map((player) => (
                <li key={player.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => choose(player)}
                    className="hover:bg-bk-surface-raised flex w-full items-center gap-2 px-3 py-2 text-left text-sm disabled:opacity-50"
                  >
                    {player.crestUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={player.crestUrl} alt="" width={18} height={18} />
                    )}
                    <span className="flex-1">{player.name}</span>
                    {player.teamName && (
                      <span className="text-bk-text-secondary text-xs">{player.teamName}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {error && <p className="text-bk-bundesliga mt-1 text-xs">{error}</p>}
    </div>
  );
}
