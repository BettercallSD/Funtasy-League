// External team names never match our admin-entered names exactly (e.g.
// "Manchester City FC" vs "Manchester City") — strip suffixes/punctuation
// and compare, falling back to substring containment. Shared by the
// standings sync and the player squad sync so both degrade the same way
// when a team can't be matched (skip it, don't crash).
//
// Word boundaries are kept (single spaces between tokens) rather than
// squashed out entirely — squashing them previously let unrelated names
// collide, e.g. "barcelona" matched inside "rcd espanyol de barcelona"
// once spaces were stripped, silently handing Espanyol's crest to
// Barcelona's row instead. Filler words ("de", "club") and standalone
// digits (e.g. the "04" in "Bayer 04 Leverkusen") are dropped since they
// vary between an official name and the shorter name admins tend to enter.
const FILLER_WORDS = /\b(fc|cf|afc|ac|cfc|club|de)\b/g;
const STANDALONE_DIGITS = /\b\d+\b/g;

export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(FILLER_WORDS, " ")
    .replace(STANDALONE_DIGITS, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchTeamByName(
  externalName: string,
  candidateTeams: { id: string; name: string }[],
): string | null {
  const normalizedExternal = normalizeTeamName(externalName);
  for (const team of candidateTeams) {
    if (normalizeTeamName(team.name) === normalizedExternal) return team.id;
  }

  // A name can legitimately contain another club's whole name as a substring
  // (e.g. "RCD Espanyol de Barcelona" contains "Barcelona") — when more than
  // one candidate matches, prefer whichever match starts earliest in the
  // external name, since the actual club identity conventionally comes
  // first and location/suffix words come after.
  const paddedExternal = ` ${normalizedExternal} `;
  let wholeWordBest: { id: string; index: number } | null = null;
  for (const team of candidateTeams) {
    const normalizedTeam = normalizeTeamName(team.name);
    if (normalizedTeam.length === 0) continue;
    const paddedTeam = ` ${normalizedTeam} `;
    if (paddedTeam.includes(paddedExternal)) return team.id;
    if (paddedExternal.includes(paddedTeam)) {
      const index = paddedExternal.indexOf(paddedTeam);
      if (!wholeWordBest || index < wholeWordBest.index) wholeWordBest = { id: team.id, index };
    }
  }
  // Deliberately no further fallback beyond whole-word matching: a looser
  // same-word-prefix fallback was tried here (to catch e.g. our "Brest"
  // against the official "Stade Brestois 29") but it silently mismatched AC
  // Milan against "FC Internazionale Milano" too ("Milan" is just as much a
  // prefix of "Milano" as it is of "Brestois"/"Lyonnais" — there's no
  // structural way to tell the true prefixes from the false ones). A club
  // that only differs from its official name by a non-word-boundary suffix
  // needs a manual crestUrl override instead of a generic fallback.
  return wholeWordBest?.id ?? null;
}
