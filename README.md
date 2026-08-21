# Funtasy League

A football prediction game covering Europe's top 5 leagues — Premier League, La Liga, Serie A,
Bundesliga, and Ligue 1. Predict the full final table via drag-and-drop, pick six end-of-season
awards, compete with friends in private leagues, and climb public per-league leaderboards.

## Features

- **Full-table predictions** — drag-and-drop the entire final league order, not just a podium pick
- **Six award categories** — Golden Boot, Most Assists, Young Player of the Season (U23), Player
  of the Season, Surprise Team, and Disappointing Team, with real player/club search
- **Live projected leaderboard** — standings update automatically as real matches are played, so
  predictions are scored against the current table all season long, not just at the end
- **Private friend leagues** — create a league scoped to one or more seasons, invite by link or
  code, no member cap
- **Public leaderboards** — one per league per season, ranking every locked prediction
- **Guest mode** — predict without signing in, get a shareable result card, and optionally claim it
  later by creating a real account
- **Season recap pages** — a full "🏆 CHAMPION" treatment for a #1 finish, medals for top 3,
  accuracy stats for everyone else
- **Automatic Surprise/Disappointing Team calculation** — compares the community's average
  predicted finish against the real result, with an admin override for edge cases

## Scoring

| Prediction                                    | Points   |
| --------------------------------------------- | -------- |
| Champion correct                              | 25       |
| Top-bracket team (any order)                  | 10 each  |
| Exact league position (stacks with the above) | +5 bonus |
| Relegated team (any order)                    | 15 each  |
| Golden Boot                                   | 20       |
| Most Assists                                  | 20       |
| Young Player of the Season (U23)              | 15       |
| Player of the Season                          | 15       |
| Surprise Team                                 | 10       |
| Disappointing Team                            | 10       |

Top-bracket size and relegation slots are admin-configured per season (league formats and European
qualification slots genuinely change year to year), not hardcoded.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Prisma](https://www.prisma.io/) ORM + PostgreSQL ([Neon](https://neon.tech))
- [Auth.js](https://authjs.dev/) (NextAuth v5) — Google OAuth, no passwords ever stored
- Tailwind CSS
- [Zod](https://zod.dev/) for input validation
- [Vitest](https://vitest.dev/) for unit tests
- [football-data.org](https://www.football-data.org/) for live standings, scorers, and squads
- [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) for bot protection on the
  no-login guest flow
- Deployed on [Vercel](https://vercel.com), with Vercel Cron for the daily standings sync

## Security

- All database access goes through Prisma's query builder — no raw SQL anywhere
- Every mutating server action validates its input with Zod before touching the database, and
  checks the server-side session first
- Admin routes check a server-side `isAdmin` flag on the `User` record, re-verified on every
  request — never a client-trusted claim
- A nonce-based Content-Security-Policy, `X-Frame-Options`, and other standard security headers are
  set on every response
- Rate limiting on auth, guest predictions, prediction claims, and friend-league joins — the four
  endpoints an anonymous or low-friction actor could otherwise hit repeatedly
- Guest submissions require a Cloudflare Turnstile pass before anything touches the database

## Getting started

```bash
npm install
cp .env.example .env   # fill in your own values — see comments in the file
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Running tests

```bash
npm test
```

### Useful scripts

```bash
npm run lint          # ESLint
npm run format:check  # Prettier check
npx tsc --noEmit      # Typecheck
npm run build         # Production build
```

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for a full walkthrough of deploying to Vercel, including
environment variables, OAuth/Turnstile domain configuration, and running migrations against
production.
