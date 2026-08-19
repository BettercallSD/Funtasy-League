// External team names never match our admin-entered names exactly (e.g.
// "Manchester City FC" vs "Manchester City") — strip suffixes/punctuation
// and compare, falling back to substring containment. Shared by the
// standings sync and the player squad sync so both degrade the same way
// when a team can't be matched (skip it, don't crash).
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fc|cf|afc|ac)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function matchTeamByName(
  externalName: string,
  candidateTeams: { id: string; name: string }[],
): string | null {
  const normalizedExternal = normalizeTeamName(externalName);
  for (const team of candidateTeams) {
    if (normalizeTeamName(team.name) === normalizedExternal) return team.id;
  }
  for (const team of candidateTeams) {
    const normalizedTeam = normalizeTeamName(team.name);
    if (
      normalizedTeam.length > 0 &&
      (normalizedTeam.includes(normalizedExternal) || normalizedExternal.includes(normalizedTeam))
    ) {
      return team.id;
    }
  }
  return null;
}
