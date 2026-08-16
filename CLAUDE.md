# Project: Ball Knowledge

A football prediction game covering Europe's top 5 leagues (Premier League, La Liga, Serie A,
Bundesliga, Ligue 1). Users predict the full final league table (via drag-and-drop) plus six award
categories, compete with friends in private leagues, and appear on public per-league leaderboards.
"Ball Knowledge" is the brand voice — playful, football-fan energy, never corporate. Tagline
territory: "Let's test your ball knowledge." Bragging-rights tiers at season end:
🥇 Football Professor · 🥈 Decent Ball Knowledge · 🥉 Needs to Watch More Football · Last — "You
Don't Know Ball" 😂. Lean into this voice in microcopy, empty states, and loading messages — it's
the main thing that keeps this from feeling like generic template software.

## Tech stack (all free-tier)

- Next.js (App Router) + TypeScript
- Prisma ORM + PostgreSQL (Neon free tier)
- Auth.js (NextAuth v5), Google OAuth as the only sign-in method — no passwords stored, ever
- Tailwind CSS
- Zod for all input validation
- Deployed on Vercel (free tier), Vercel Cron for scheduled jobs
- football-data.org free tier API for live standings/scorers
- Cloudflare Turnstile for bot protection on the no-login guest flow

## Non-negotiable security rules

- Never write raw SQL. All database access goes through Prisma's query builder — this is what
  makes the app SQL-injection-proof, not an afterthought bolted on later.
- Every API route or server action that mutates data validates its input with a Zod schema BEFORE
  touching the database, and checks the server-side session before doing anything user-specific.
- Admin-only routes check a server-side `isAdmin` flag on the User record — never trust a client-
  sent role claim.
- Session cookies: httpOnly, secure, sameSite. No tokens or secrets ever shipped to the client.
- Rate-limit: auth endpoints, the guest prediction endpoint, the claim endpoint, and the
  friend-league join endpoint. These are the four places an anonymous or low-friction actor can
  hit the app repeatedly.
- Guest (no-login) submissions require a Cloudflare Turnstile pass before they touch the database.
- Set standard security headers (CSP, X-Frame-Options, X-Content-Type-Options) in `next.config` or
  middleware.
- All environment secrets live in `.env` (gitignored) with a committed `.env.example` showing the
  required keys with placeholder values.
- No user-supplied text is ever rendered as raw HTML.

## Design language — avoid generic AI-SaaS look

- Dark, dense, data-driven — think FotMob/SofaScore, not a marketing landing page. No big gradient
  hero banners, no rounded-blob illustrations, no generic stock photography.
- Dark charcoal/navy base. Each league gets its own accent color pulled from that league's real
  competition branding, adapted to sit well on a dark background (not raw saturated web colors).
- Club crests do the visual work that icons or illustrations would otherwise do.
- Typography: a tight/condensed grotesk for tables and numbers — data density matters more than
  whitespace here. Avoid soft rounded "friendly SaaS" fonts.
- Real data tables, not oversized cards, for anything list-like (standings, leaderboards).

## Core data model (season-versioned — never lose this)

- `League` — id, name, slug, accentColor
- `Season` — id, leagueId, year, teamCount, directRelegationCount, playoffRelegationCount,
  europeanQualificationSlots, predictionLockAt, status. **All of these counts are admin-configured
  per season, not hardcoded** — league formats and European slot counts genuinely change year to
  year (e.g. Bundesliga/Ligue 1 relegate fewer teams than the other three, and European slot counts
  shift with UEFA coefficient rules).
- `Team`, `SeasonTeam` (which teams are in which league that season, promoted/relegated flags)
- `Player` — for the award-category search/autocomplete, includes dateOfBirth (needed for the
  under-23 Emerging Player category) and current team
- `User` — googleId, email, name, image, isAdmin
- `Prediction` — userId (nullable for guests), seasonId, guestToken (nullable), isGuest, lockedAt,
  claimed
- `PredictionTableEntry` — predictionId, teamId, predictedPosition (the dragged order)
- `PredictionAward` — predictionId, category enum, value (playerId or teamId depending on category)
- `SeasonResult` — the finalized ground truth once a season ends: final table positions + award
  winners, used to score every prediction against
- `FriendLeague` — creatorId, name, inviteCode, scoped to one or more Season ids chosen at creation,
  maxMembers
- `FriendLeagueMember`

## Scoring rules (exactly this — keep it simple, this is final)

| Prediction                                                                              | Points   |
| --------------------------------------------------------------------------------------- | -------- |
| Champion correct                                                                        | 25       |
| Top-bracket team (any order, N = that season's `europeanQualificationSlots`)            | 10 each  |
| Exact league position (any team, stacks with the above — e.g. exact champion = 25+5=30) | +5 bonus |
| Relegated team (any order, counts direct + playoff relegation slots)                    | 15 each  |
| Golden Boot (top scorer)                                                                | 20       |
| Most assists                                                                            | 20       |
| Young Player of the Season                                                              | 15       |
| Surprise Team                                                                           | 10       |
| Disappointing Team                                                                      | 10       |

Tie-breaker for any leaderboard: whoever has the most "+5 exact position" bonuses wins the tie.
If still tied, they're shown tied — no further tiebreak.

## How award categories get resolved at season end

- **Golden Boot, Most Assists, Young Player of the Season** — commissioner (admin) manually enters
  the winner. (Optional future enhancement: for Premier League specifically, the real PFA Young
  Player of the Season award could be pulled in as ground truth instead of an admin call — not
  required for v1.)
- **Surprise Team / Disappointing Team** — calculated automatically: take the average predicted
  finishing position for each team across all _locked, non-guest_ predictions for that season, and
  compare it to the actual final position. The team that most outperformed the community's average
  expectation is Surprise Team; the team that most underperformed it is Disappointing Team. Show
  the math on the result page ("Community expected 8th, finished 3rd"). Give the admin a manual
  override for edge cases.
- **Emerging Player (U23)** — commissioner manual call, filtered to players under 23 at the time.

## Prediction locking

One global lock date per season, admin-set (not hardcoded), intended to be set to that season's
earliest-starting league's kickoff at minimum, and no later than that league finishing its first
full matchweek. After lock, no predictions (new or edited) are accepted for that season. If someone
signs up after the lock has passed, they've missed the competitive window for that season entirely
— they can still use guest mode, just not the ranked one.

## Guest mode (no account required)

- Full drag-the-table + award-picks flow, usable by anyone, any time, no login.
- On submission: Turnstile check, rate-limited by IP, generates a shareable result card image
  (predictions + a timestamp/label like "Predicted after GW1") plus a unique link tied to an
  anonymous `guestToken` record in the database.
- Guest predictions **never** enter the public leaderboard, a friend league, or the Surprise/
  Disappointing Team community-average calculation, under any circumstance — this boundary is
  structural (a `isGuest` flag checked everywhere scoring is aggregated), not a UI-level hide.
- A signed-up user can "claim" a guest prediction via its link/token, attaching it to their profile
  as personal history only. **Cap: one claimable guest prediction per account, ever** — the first
  successful claim locks the slot; later claim attempts are rejected. This stops someone from
  making a pile of guesses and cherry-picking the best one after results are known.
- Claiming a guest prediction never transfers points into the real competitive game. To actually
  compete, a signed-up user makes a separate, fresh prediction through the normal locked flow.

## Leaderboards

- **Private friend leagues**: creator picks which season(s) the league covers at creation time.
  Points are summed only across that agreed scope, so members are always compared like-for-like.
  Invite via a shareable link with a short code; creator can remove members or regenerate the link
  to invalidate old invites.
- **Public leaderboards**: one per league per season (never combined across leagues), ranking every
  locked, non-guest prediction for that league-season.
