// A user's chosen username (if they've set one) always wins over their
// Google account name — some people don't want to predict under their real
// name. Falls back to "Anonymous" only for the theoretical case where
// Google never supplied a name at all.
export function getDisplayName(user: { name: string | null; username: string | null }): string {
  return user.username ?? user.name ?? "Anonymous";
}
