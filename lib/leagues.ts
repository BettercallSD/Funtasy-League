// Static config for the 5 leagues so nav/pages render before Season/League
// rows exist in the database (Phase 2 adds the admin CRUD that will
// eventually seed matching League records with these same slugs).

export type LeagueSlug = "premier-league" | "la-liga" | "serie-a" | "bundesliga" | "ligue-1";

export interface LeagueConfig {
  slug: LeagueSlug;
  name: string;
  shortName: string;
  /** Tailwind color token defined in app/globals.css, e.g. "bk-premier-league" */
  accentToken: string;
}

export const LEAGUES: LeagueConfig[] = [
  {
    slug: "premier-league",
    name: "Premier League",
    shortName: "PL",
    accentToken: "bk-premier-league",
  },
  {
    slug: "la-liga",
    name: "La Liga",
    shortName: "La Liga",
    accentToken: "bk-la-liga",
  },
  {
    slug: "serie-a",
    name: "Serie A",
    shortName: "Serie A",
    accentToken: "bk-serie-a",
  },
  {
    slug: "bundesliga",
    name: "Bundesliga",
    shortName: "BL",
    accentToken: "bk-bundesliga",
  },
  {
    slug: "ligue-1",
    name: "Ligue 1",
    shortName: "L1",
    accentToken: "bk-ligue-1",
  },
];

export const DEFAULT_LEAGUE_SLUG: LeagueSlug = "premier-league";

export function getLeague(slug: string): LeagueConfig | undefined {
  return LEAGUES.find((league) => league.slug === slug);
}

// Literal Tailwind class strings (not template-interpolated) so the
// build-time scanner can see and generate them.
export const LEAGUE_ACCENT_CLASSES: Record<
  LeagueSlug,
  { border: string; text: string; bg: string }
> = {
  "premier-league": {
    border: "border-bk-premier-league",
    text: "text-bk-premier-league",
    bg: "bg-bk-premier-league",
  },
  "la-liga": { border: "border-bk-la-liga", text: "text-bk-la-liga", bg: "bg-bk-la-liga" },
  "serie-a": { border: "border-bk-serie-a", text: "text-bk-serie-a", bg: "bg-bk-serie-a" },
  bundesliga: {
    border: "border-bk-bundesliga",
    text: "text-bk-bundesliga",
    bg: "bg-bk-bundesliga",
  },
  "ligue-1": { border: "border-bk-ligue-1", text: "text-bk-ligue-1", bg: "bg-bk-ligue-1" },
};
