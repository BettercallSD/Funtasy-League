// Static config for the 5 leagues so nav/pages render before Season/League
// rows exist in the database (Phase 2 adds the admin CRUD that will
// eventually seed matching League records with these same slugs).

export type LeagueSlug = "premier-league" | "la-liga" | "serie-a" | "bundesliga" | "ligue-1";

export interface LeagueConfig {
  slug: LeagueSlug;
  name: string;
  shortName: string;
  /** Competition emblem, shown in the nav instead of shortName text — same
   * football-data.org source already trusted for club crests. */
  logoUrl: string;
  /** Tailwind color token defined in app/globals.css, e.g. "bk-premier-league" */
  accentToken: string;
  /** Same color as accentToken, as a raw hex — mirrors app/globals.css, used to seed League.accentColor */
  accentHex: string;
}

export const LEAGUES: LeagueConfig[] = [
  {
    slug: "premier-league",
    name: "Premier League",
    shortName: "PL",
    logoUrl: "https://crests.football-data.org/PL.png",
    accentToken: "bk-premier-league",
    accentHex: "#7c5cfc",
  },
  {
    slug: "la-liga",
    name: "La Liga",
    shortName: "La Liga",
    logoUrl: "https://crests.football-data.org/laliga.png",
    accentToken: "bk-la-liga",
    accentHex: "#ff6b4a",
  },
  {
    slug: "serie-a",
    name: "Serie A",
    shortName: "Serie A",
    logoUrl: "https://crests.football-data.org/c111.png",
    accentToken: "bk-serie-a",
    accentHex: "#22c58b",
  },
  {
    slug: "bundesliga",
    name: "Bundesliga",
    shortName: "BL",
    logoUrl: "https://crests.football-data.org/BL1.png",
    accentToken: "bk-bundesliga",
    accentHex: "#e5484d",
  },
  {
    slug: "ligue-1",
    name: "Ligue 1",
    shortName: "L1",
    logoUrl: "https://crests.football-data.org/FL1.png",
    accentToken: "bk-ligue-1",
    accentHex: "#3e7bfa",
  },
];

export const DEFAULT_LEAGUE_SLUG: LeagueSlug = "premier-league";

// Suggested starting values for the "new season" admin form, pre-filling
// the real current qualification/relegation format so admins don't have to
// re-derive it each time a season is created — still fully editable per
// CLAUDE.md, since these genuinely change year to year. Only leagues whose
// current real-world format is confirmed are listed here; the rest start
// blank rather than guess.
export interface SeasonDefaults {
  teamCount: number;
  directRelegationCount: number;
  playoffRelegationCount: number;
  championsLeagueSlots: number;
  europaLeagueSlots: number;
  conferenceLeagueSlots: number;
}

export const SEASON_DEFAULTS: Partial<Record<LeagueSlug, SeasonDefaults>> = {
  // Top 4 straight to Champions League, 5th Europa League, 6th Conference
  // League. 16th goes to the relegation playoff, 17th/18th relegate direct.
  bundesliga: {
    teamCount: 18,
    directRelegationCount: 2,
    playoffRelegationCount: 1,
    championsLeagueSlots: 4,
    europaLeagueSlots: 1,
    conferenceLeagueSlots: 1,
  },
  // Top 3 straight to Champions League, 4th to CL qualifying (counted
  // together as this app's single championsLeagueSlots figure — see
  // CLAUDE.md's "top-bracket" scoring model), 5th Europa League, 6th to
  // Conference League qualifying. 16th goes to the relegation playoff,
  // 17th/18th relegate direct.
  "ligue-1": {
    teamCount: 18,
    directRelegationCount: 2,
    playoffRelegationCount: 1,
    championsLeagueSlots: 4,
    europaLeagueSlots: 1,
    conferenceLeagueSlots: 1,
  },
};

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
