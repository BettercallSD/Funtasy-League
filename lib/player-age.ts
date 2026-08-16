// Shared by the player search route (U23 filtering for Emerging Player) and
// the predict page (server-side popular-U23-picks list) so the "under 23"
// definition can't drift between the two call sites.
export function getAge(dateOfBirth: Date, at: Date = new Date()): number {
  let age = at.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthdayThisYear =
    at.getMonth() > dateOfBirth.getMonth() ||
    (at.getMonth() === dateOfBirth.getMonth() && at.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}
