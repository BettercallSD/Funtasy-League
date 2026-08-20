# Ball Knowledge — Progress Status

Written as a recovery reference in case Claude Code needs to be reinstalled and a fresh
session needs to pick this project back up. Read this alongside `CLAUDE.md` (the persistent
project spec) — this file is a snapshot of *where things stand*, not the spec itself.

Last updated: 2026-08-19

## How to resume

1. Open this repo in Claude Code (`C:\Users\saura\OneDrive\Desktop\Project\Football`).
2. `CLAUDE.md` in the repo root has the full product spec — Claude Code reads it automatically.
3. Tell Claude Code: "read qwerty.md for where we left off, then continue with Phase 8" (or
   whatever phase is next per the table below).
4. Run `npm install` if `node_modules` isn't present, then `npm run dev` to confirm it still
   builds before continuing.

## External services — all already set up

These all have real credentials sitting in the local `.env` file (gitignored, never committed —
if you reinstall Claude Code on the *same machine* this file survives; if you move to a new
machine you'll need to re-enter these from each service's dashboard):

| Service | Used for | Status |
|---|---|---|
| Neon (PostgreSQL) | Database | ✅ Connected, migrations applied |
| Google Cloud Console (OAuth) | Sign-in | ✅ Client ID/Secret configured, tested working |
| football-data.org | Live standings + player squads | ✅ API key configured, tested working (653 real Premier League players synced in) |
| Cloudflare Turnstile | Guest-mode bot protection | ✅ Site key + secret key configured; secret key independently verified valid against Cloudflare's siteverify API; widget-render bug just fixed (see below) |

`CRON_SECRET` is also set (self-generated, protects the `/api/cron/sync-standings` route).

**If you ever need to regenerate any of these**, the exact steps are in the conversation history,
but in short: Neon dashboard → connection string; Google Cloud Console → APIs & Services →
Credentials; football-data.org → account dashboard; Cloudflare dashboard → Turnstile → Add widget
manually (NOT "Set up with Spin" — that's Cloudflare's own AI assistant, unrelated to Claude Code).

## Live data state (as of last check)

- 1 Premier League season exists (2026/27), admin-created, all 20 real teams added with crests.
- 653 real Premier League players synced in from football-data.org (name, position, DOB, team).
- The 2026/27 season hadn't kicked off yet as of last sync (starts 2026-08-21 per football-data.org
  itself) — so live standings/top-scorer data is still all-zero. That's expected, not a bug; it'll
  populate once matches are played and the daily cron (or the admin "Sync now" button) runs again.
- No season has been finalized yet, so the final leaderboard is empty (expected — only the live
  projected leaderboard has anything to show pre-finalization).
- Admin access: `sauravdahal887@gmail.com` has `isAdmin: true`. To grant it to another account:
  `npx tsx scripts/grant-admin.ts <email>`.

## Phase-by-phase status

| Phase | What it is | Status |
|---|---|---|
| 0 | Project scaffolding (Next.js, Prisma, Tailwind, full schema) | ✅ Done |
| 1 | Design system, Google OAuth, league nav shell | ✅ Done |
| 2 | Admin League/Season/Team configuration | ✅ Done |
| 3 | Drag-and-drop table prediction mechanic | ✅ Done |
| 4 | Award predictions (Golden Boot, Assists, etc.) with player search | ✅ Done |
| 5 | Scoring engine, live projected leaderboard, final leaderboard | ✅ Done |
| 6 | Friend leagues (create/join/invite/leaderboard) | ✅ Done |
| 7 | Guest mode (no-login predictions, Turnstile, claim flow) | ✅ Done, Turnstile bug fixed and re-verified |
| 8 | Badges/tiers, season recap, prediction history polish | 🔜 **Next up** — see note below |
| 9 | Security hardening pass + deployment (`DEPLOY.md`, Vercel) | ⬜ Not started |

Everything through Phase 7 (plus two follow-up bug-fix commits) is committed to git on `master`.
Nothing is deployed yet — this only runs locally via `npm run dev` so far.

## Phase 8 — scope decision already made

CLAUDE.md's original spec calls for 4 named bragging-rights tiers at season end:
🥇 Football Professor · 🥈 Decent Ball Knowledge · 🥉 Needs to Watch More Football · Last —
"You Don't Know Ball" 😂.

**User decided (2026-08-19): skip the named tiers, just show medals for top 3** (🥇🥈🥉 by
final rank), no tier-name copy for everyone else. Simpler badge system than CLAUDE.md
currently describes. When Phase 8 is built, update CLAUDE.md's "Guest mode" / bragging-rights
section to reflect this simplification so it doesn't drift back to the old 4-tier design later.

Phase 8 still needs, per the original spec (minus the tier-name part):
- Assign medal (top 3) at season finalize, per scope (public league-season leaderboard, and
  separately within each friend league)
- A season-recap page/screen per user ("🏆 you're #1" framing for a top finish, total points,
  accuracy like "8/12 correct")
- A prediction-history page (this partly exists already — `/me` — may just need polish/extension)

## Notable deviations / fixes made beyond the original build guide

These came from real defects found during testing, or from mid-build product decisions — worth
knowing so a fresh session doesn't "fix" them back to the original spec by mistake:

1. **Emerging Player (U23) scoring** — CLAUDE.md originally had no point value for this award
   category despite it being one of the six. Set to 15 points (same as Young Player), confirmed
   with the user. Already reflected in the current CLAUDE.md.
2. **European qualification slots** — split from one vague "europeanQualificationSlots" count into
   three separate admin fields: `championsLeagueSlots`, `europaLeagueSlots`,
   `conferenceLeagueSlots` (their sum is the scoring engine's "top-bracket" N). Already reflected
   in the current CLAUDE.md and schema.
3. **Season year field** — stores just the starting year as an integer (e.g. `2026`), formatted
   everywhere as `2026/27` via `lib/format-season.ts`. Typing a slash directly doesn't work by
   design — that's intentional, not a bug.
4. **Player pool** — award search is backed by a real football-data.org squad sync
   (`lib/sync-players.ts`), not a hand-picked fixture list. The original ~16-player fixture list in
   `prisma/seed.ts` still exists as a fallback/bootstrap but is superseded by real synced data.
5. **Turnstile widget** — must use plain DOM script injection (see `components/turnstile-widget.tsx`),
   not `next/script` — that crashed the page with a 500 once a real site key was configured.
6. **MongoDB was considered and rejected** — user asked about switching off Postgres; kept Neon
   Postgres since Prisma 7 (what this project uses) has no MongoDB connector at all, and the
   schema leans heavily on relational features (compound uniques, cascading deletes,
   multi-document transactions) that don't map cleanly to Mongo anyway.
7. **Guest mode UI reuse** — genuinely shares code with the authenticated flow rather than
   duplicating it: `components/draggable-team-list.tsx` is the one drag-and-drop implementation
   used by the authenticated predict board, the admin finalize picker, *and* the guest form.
   `PlayerPicker`/`TeamPicker` got an optional `onSelect` prop so they can run in a "controlled"
   (local-state, no auto-persist) mode for guests instead of duplicating the search/autocomplete UI.
8. **Rate limiting is DB-backed**, not in-memory (`lib/rate-limit.ts`, backed by a `RateLimitHit`
   table) — deliberate, since Vercel serverless functions don't share memory across instances, so
   an in-memory limiter would silently not work once deployed.

## Known gaps / things not yet done

- **Phase 9 not started at all** — no security hardening audit pass yet, no `DEPLOY.md`, nothing
  deployed to Vercel. The app currently only exists as a local dev server.
- **No real match data yet** — the 2026/27 PL season hasn't started in real life as of last check,
  so live standings/top-scorer sync has nothing to show yet. Nothing to fix, just needs time (or
  test data) to actually demonstrate the live-projected-scoring flow end-to-end with real
  differentiated standings.
- **Only Premier League has teams/season configured** — La Liga, Serie A, Bundesliga, Ligue 1 all
  exist as `League` rows (seeded) but have no `Season`/`Team` data yet. Same admin flow works for
  them, just hasn't been run.
- **No automated test suite** — everything has been verified manually (build, lint, and targeted
  one-off scripts against the real Neon database, cleaned up after each test). No `npm test` step
  exists in this repo.
