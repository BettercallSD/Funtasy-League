import type { LeagueSlug } from "@/lib/leagues";

// football-data.org free tier: 10 requests/minute, no assists data at all.
// This module is a thin fetch wrapper only — matching external team/player
// names to our own Team/Player rows happens in the sync job that calls it
// (lib/sync-standings.ts), since that needs DB access this module shouldn't.

const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";

export const COMPETITION_CODES: Record<LeagueSlug, string> = {
  "premier-league": "PL",
  "la-liga": "PD",
  "serie-a": "SA",
  bundesliga: "BL1",
  "ligue-1": "FL1",
};

export interface StandingsRow {
  teamExternalName: string;
  position: number;
}

export interface TopScorerResult {
  playerName: string;
  teamExternalName: string | null;
}

async function footballDataFetch(path: string): Promise<unknown> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set");
  }
  const response = await fetch(`${FOOTBALL_DATA_BASE_URL}${path}`, {
    headers: { "X-Auth-Token": apiKey },
  });
  if (response.status === 429) {
    throw new Error("football-data.org rate limit hit");
  }
  if (!response.ok) {
    throw new Error(`football-data.org request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchStandings(leagueSlug: LeagueSlug): Promise<StandingsRow[]> {
  const code = COMPETITION_CODES[leagueSlug];
  const data = (await footballDataFetch(`/competitions/${code}/standings`)) as {
    standings: { type: string; table: { position: number; team: { name: string } }[] }[];
  };
  const total = data.standings.find((table) => table.type === "TOTAL");
  if (!total) return [];
  return total.table.map((row) => ({ teamExternalName: row.team.name, position: row.position }));
}

export async function fetchTopScorer(leagueSlug: LeagueSlug): Promise<TopScorerResult | null> {
  const code = COMPETITION_CODES[leagueSlug];
  const data = (await footballDataFetch(`/competitions/${code}/scorers?limit=1`)) as {
    scorers: { player: { name: string }; team?: { name: string } }[];
  };
  const top = data.scorers[0];
  if (!top) return null;
  return { playerName: top.player.name, teamExternalName: top.team?.name ?? null };
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
