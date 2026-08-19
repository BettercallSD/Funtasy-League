"use client";

import { useState, useTransition } from "react";
import { setAward } from "@/lib/actions/award-actions";
import type { AwardCategory } from "@/lib/generated/prisma/enums";

export interface TeamOption {
  id: string;
  name: string;
  crestUrl: string | null;
}

export function TeamPicker({
  seasonId,
  category,
  label,
  teams,
  selected,
  disabled,
  onSelect,
}: {
  seasonId: string;
  category: AwardCategory;
  label: string;
  teams: TeamOption[];
  selected: TeamOption | null;
  disabled: boolean;
  /** Controlled mode (e.g. guest predictions): report the pick instead of persisting it via setAward. */
  onSelect?: (team: TeamOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(selected);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = teams.filter((team) => team.name.toLowerCase().includes(query.toLowerCase()));

  function choose(team: TeamOption) {
    setError(null);

    if (onSelect) {
      onSelect(team);
      setCurrent(team);
      setQuery("");
      return;
    }

    startTransition(async () => {
      try {
        await setAward(seasonId, category, team.id);
        setCurrent(team);
        setQuery("");
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
            placeholder="Search teams…"
            className="border-bk-border bg-bk-bg mt-2 w-full rounded-md border px-3 py-2 text-sm"
          />
          <ul className="border-bk-border divide-bk-border mt-1 max-h-48 divide-y overflow-y-auto rounded-md border">
            {filtered.map((team) => (
              <li key={team.id}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => choose(team)}
                  className="hover:bg-bk-surface-raised flex w-full items-center gap-2 px-3 py-2 text-left text-sm disabled:opacity-50"
                >
                  {team.crestUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={team.crestUrl} alt="" width={18} height={18} />
                  )}
                  <span>{team.name}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="text-bk-text-secondary px-3 py-2 text-sm">No teams match.</li>
            )}
          </ul>
        </>
      )}

      {error && <p className="text-bk-bundesliga mt-1 text-xs">{error}</p>}
    </div>
  );
}
