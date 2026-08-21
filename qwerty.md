# Funtasy League — Progress Status

Written as a recovery reference in case Claude Code needs to be reinstalled and a fresh
session needs to pick this project back up. Read this alongside `CLAUDE.md` (the persistent
project spec) — this file is a snapshot of _where things stand_, not the spec itself.

Last updated: 2026-08-20 (Cowork session, correcting a stale 2026-08-19 snapshot — see note below)

**Note on this update:** the previous version of this file said Phase 8 was "next up," but the
code on disk showed Phase 8 was actually already built (medals, both recap pages, `/me` polish)
— just never checked off here, likely because the session that built it ended before it could
update this file. This revision verifies that work, fixes two real gaps it found, and starts
Phase 9. If a future session finds this file _and_ the code disagree again, trust the code —
check file mtimes / `git log` before assuming this file is current.

## How to resume

1. Open this repo in Claude Code (`C:\Users\saura\OneDrive\Desktop\Project\Football`).
2. `CLAUDE.md` in the repo root has the full product spec — Claude Code reads it automatically.
3. Tell Claude Code: "read qwerty.md for where we left off, then continue with Phase 9" (or
   whatever phase is next per the table below).
4. Run `npm install` if `node_modules` isn't present, then `npm run dev` to confirm it still
   builds before continuing.
5. **Run `npm run build` once** before trusting anything else — the last verification pass (see
   below) could only check lint/format/most-of-typecheck, not a real `next build`, because the
   sandbox it ran in couldn't reach `binaries.prisma.sh` to run `prisma generate`. This is very
   likely fine (see "Verification note" below) but hasn't been proven with a real build yet.

## External services — all already set up

These all have real credentials sitting in the local `.env` file (gitignored, never committed —
if you reinstall Claude Code on the _same machine_ this file survives; if you move to a new
machine you'll need to re-enter these from each service's dashboard):

| Service                      | Used for                       | Status                                                                                                           |
| ---------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Neon (PostgreSQL)            | Database                       | ✅ Connected, migrations applied                                                                                 |
| Google Cloud Console (OAuth) | Sign-in                        | ✅ Client ID/Secret configured, tested working                                                                   |
| football-data.org            | Live standings + player squads | ✅ API key configured, tested working (653 real Premier League players synced in)                                |
| Cloudflare Turnstile         | Guest-mode bot protection      | ✅ Site key + secret key configured; secret key independently verified valid against Cloudflare's siteverify API |

`CRON_SECRET` is also set (self-generated, protects the `/api/cron/sync-standings` route).

**If you ever need to regenerate any of these**, the exact steps are in the conversation history,
but in short: Neon dashboard → connection string; Google Cloud Console → APIs & Services →
Credentials; football-data.org → account dashboard; Cloudflare dashboard → Turnstile → Add widget
manually (NOT "Set up with Spin" — that's Cloudflare's own AI assistant, unrelated to Claude Code).

## Live data state (as of last check)

- 1 Premier League season exists (2026/27), admin-created, all 20 real teams added with crests.
- 653 real Premier League players synced in from football-data.org (name, position, DOB, team).
- The 2026/27 season was due to start 2026-08-21 per football-data.org — check whether live
  standings/top-scorer data has populated yet; if not, that's expected until matches are played
  and the daily cron (or the admin "Sync now" button) runs again.
- No season has been finalized yet, so the final leaderboard is empty (expected — only the live
  projected leaderboard has anything to show pre-finalization).
- Admin access: `sauravdahal887@gmail.com` has `isAdmin: true`. To grant it to another account:
  `npx tsx scripts/grant-admin.ts <email>`.

## Phase-by-phase status

| Phase | What it is                                                        | Status                                      |
| ----- | ----------------------------------------------------------------- | ------------------------------------------- |
| 0     | Project scaffolding (Next.js, Prisma, Tailwind, full schema)      | ✅ Done                                     |
| 1     | Design system, Google OAuth, league nav shell                     | ✅ Done                                     |
| 2     | Admin League/Season/Team configuration                            | ✅ Done                                     |
| 3     | Drag-and-drop table prediction mechanic                           | ✅ Done                                     |
| 4     | Award predictions (Golden Boot, Assists, etc.) with player search | ✅ Done                                     |
| 5     | Scoring engine, live projected leaderboard, final leaderboard     | ✅ Done                                     |
| 6     | Friend leagues (create/join/invite/leaderboard)                   | ✅ Done                                     |
| 7     | Guest mode (no-login predictions, Turnstile, claim flow)          | ✅ Done                                     |
| 8     | Badges/tiers, season recap, prediction history polish             | ✅ Done — verified this session (see below) |
| 9     | Security hardening pass + deployment (`DEPLOY.md`, Vercel)        | 🔜 **In progress** — see below              |

Everything through Phase 8 is code-complete. **Not yet confirmed committed to git** — this
session worked through the desktop file bridge, which doesn't have git access; check
`git status` / `git log` next session and commit anything still pending (Phase 8's files plus
this session's Phase 9 edits, listed below).

## Phase 8 — verified complete this session

Scope decision from 2026-08-19 (recorded here since it's easy to re-litigate by accident): **no
named bragging-rights tiers, just medals for top 3** (🥇🥈🥉 by final rank). CLAUDE.md already
reflects this simplification — don't drift back to the original 4-tier design.

What's actually in the code, verified by reading every file involved:

- `lib/medals.ts` — `getMedalEmoji(rank)`, medals are **derived from live rank at render time**,
  not stored on any row. This matches the "top 3 by final rank" scope decision exactly — no
  schema/migration was needed, and none was added.
- Public league leaderboard (`app/leagues/[slug]/leaderboard/page.tsx`) and friend-league page
  (`app/friend-leagues/[id]/page.tsx`) both show the medal emoji in the rank column via
  `computeRanks` (`lib/rank-predictions.ts`) + `getMedalEmoji`.
- Season recap pages exist for both scopes — `app/leagues/[slug]/recap/page.tsx` and
  `app/friend-leagues/[id]/recap/page.tsx` — both give a #1 finish the full "🏆 [NAME] IS THE
  FUNTASY LEAGUE CHAMPION" treatment, a medal + rank for 2nd/3rd, plain rank otherwise, plus
  total score and an "X/Y correct" accuracy stat (`lib/prediction-accuracy.ts`).
- `/me` (`app/me/page.tsx`) was extended with per-prediction accuracy and a "See recap" link for
  finalized seasons — this was the "may just need polish" item from the original Phase 8 scope,
  and it's now done.

## Phase 9 — kicked off this session

### Fixed this session (real gaps found while auditing against CLAUDE.md's own security rules)

CLAUDE.md's "Non-negotiable security rules" says four endpoints must be rate-limited: auth,
guest prediction, claim, friend-league join. Guest prediction and friend-league join already
were; auth and claim were not. Both fixed:

1. **`lib/actions/claim-actions.ts`** — `claimGuestPrediction` now calls `checkRateLimit`
   (10 attempts / 10 min per IP), matching the pattern already used in
   `lib/actions/friend-league-actions.ts`.
2. **`app/api/auth/[...nextauth]/route.ts`** — wraps NextAuth's `GET`/`POST` handlers with a
   rate limit (30 requests / 5 min per IP) before delegating. Generous on purpose — a normal
   sign-in round trip hits this a few times — but enough to blunt hammering the callback route.

Also added, per CLAUDE.md's "Set standard security headers... in `next.config` or middleware"
(previously not done at all):

3. **`next.config.ts`** — added a `headers()` function setting CSP, `X-Frame-Options`,
   `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and
   `Strict-Transport-Security`. The CSP was scoped by reading what the app actually loads
   (Google OAuth, Cloudflare Turnstile's script + iframe, `next/font/google`, arbitrary-https
   crest `<img>` tags) — **it has not been tested against a live running app yet**. First thing
   to do next session: run `npm run dev`, open the browser console, and click through sign-in +
   a guest prediction submission watching for CSP violation warnings. The DEPLOY.md smoke-test
   checklist covers this for the production deploy too.

4. **`DEPLOY.md`** (new file, repo root) — full Vercel deployment walkthrough: env var checklist,
   updating Google OAuth's authorized redirect URIs and Turnstile's allowed domains for the
   production domain, running `prisma migrate deploy` against prod, verifying Vercel Cron picked
   up `vercel.json`'s schedule, and a post-deploy smoke test list.

### Verification note (why "done" here isn't the same as "proven")

This session ran from the Claude desktop app's file bridge, in a sandboxed cloud container with
restricted network egress — it could reach `registry.npmjs.org` (so `npm install` worked fully)
but **not** `binaries.prisma.sh` (so `prisma generate` failed with a 403, every time, on every
retry). That means:

- `npx tsc --noEmit` ran, but every file touching a Prisma query result showed cascading
  `Cannot find module '@/lib/generated/prisma/...'` errors — expected, not real bugs, since the
  generated client doesn't exist without a successful `prisma generate`. After manually
  filtering those out (and the one other expected gap — `LayoutProps` in `app/layout.tsx`, a
  Next.js typed-routes global that only gets generated by `next build`/`next dev`), **zero
  non-cascade type errors remained** across the whole repo, including this session's new/edited
  files.
- `npx eslint .` passed clean (exit 0) — this doesn't need the generated Prisma client.
- `npx prettier --check .` passed clean on all code files (only this file itself needed
  reformatting, which is fine, it's prose not code).
- A real `next build` was **not** achievable in that sandbox. The `mcp__remote-devices__device_bash`
  tool (which runs commands directly on this machine, where `node_modules` + a working Prisma
  install + real internet access all already exist) reported "workspace still starting" on every
  attempt for the full session — never came up. **Next session, try that tool again before
  falling back to the cloud-sandbox approach** — if the local device workspace is up, a real
  `npm run build` there is strictly better verification than what this session could do.
- Given all of the above, confidence is high but not 100% — the honest status is "everything
  checkable without a real Prisma client checks out clean," not "verified end-to-end."

### Still to do in Phase 9

- [ ] **Prove it with a real build.** Run `npm run build` locally (not in a sandbox) and fix
      anything it surfaces that the partial check above couldn't catch.
- [ ] **Commit.** Check `git status` — Phase 8's files and this session's four Phase 9 edits
      (`lib/actions/claim-actions.ts`, `app/api/auth/[...nextauth]/route.ts`, `next.config.ts`,
      `DEPLOY.md`) may all still be uncommitted. This session couldn't run git (no bash access on
      this machine from the desktop bridge).
- [ ] **Test the new CSP against a running app** — see the verification note above. This is the
      one part of this session's work that's a genuine guess (an informed one, from reading the
      code) rather than something checked.
- [ ] **Deploy to Vercel**, following the new `DEPLOY.md` — this needs you at the keyboard for
      the parts that touch your Vercel/Google/Cloudflare accounts (env vars, OAuth redirect URIs,
      Turnstile allowed domains). Claude can't do those steps without your accounts.
- [ ] **Consider a minimal test suite** before real traffic — `lib/scoring.ts` and
      `lib/rank-predictions.ts` are pure functions, cheap to unit test, and are the part of this
      app where a silent bug would be most embarrassing (wrong points on a public leaderboard).
      Noted in `DEPLOY.md`'s "Known gaps" too.
- [ ] Everything already known from before: only Premier League has a season configured (other
      four leagues just need the same admin setup run once); no automated test suite exists yet.
