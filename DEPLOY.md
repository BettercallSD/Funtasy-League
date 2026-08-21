# Deploying Funtasy League to Vercel

This app is built to deploy on Vercel's free tier with Neon Postgres, Google OAuth,
football-data.org, and Cloudflare Turnstile — all of which are already set up in the local
`.env` (see `qwerty.md` for status). This doc walks through taking that from "runs locally"
to "live on the internet."

## 0. Before you start

Run these locally and don't proceed until they're clean:

```bash
npm install
npm run lint
npm run format:check
npx tsc --noEmit
npm run build
```

`npm run build` is the most important one — it catches anything a plain typecheck won't
(e.g. issues in generated route types, `next.config.ts`, prerendering).

## 1. Push to GitHub

Vercel deploys from a Git repo. If this repo isn't on GitHub yet:

```bash
git remote add origin https://github.com/<your-username>/funtasy-league.git
git push -u origin master
```

(Or use the GitHub CLI / desktop app if you prefer — any way of getting `master` onto GitHub
works.)

## 2. Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in (GitHub login is easiest since
   that's where the repo lives).
2. Import the `funtasy-league` repo. Vercel auto-detects Next.js — leave the build settings as
   default (`npm run build`, output directory auto-detected).
3. **Don't click Deploy yet** — add the environment variables first (next section), since the
   first build will fail without `DATABASE_URL` etc.

## 3. Environment variables

In the Vercel project's **Settings → Environment Variables**, add every key from `.env.example`,
using your real values from the local `.env`:

| Key                              | Notes                                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | Same Neon connection string as local — Neon is already a hosted DB, no migration needed.                                          |
| `GOOGLE_CLIENT_ID`               | Same as local.                                                                                                                    |
| `GOOGLE_CLIENT_SECRET`           | Same as local.                                                                                                                    |
| `NEXTAUTH_SECRET`                | Same as local, **or** generate a fresh one for prod with `npx auth secret`.                                                       |
| `NEXTAUTH_URL`                   | **Must change** — set to your production URL, e.g. `https://funtasy-league.vercel.app` (or your custom domain once you have one). |
| `FOOTBALL_DATA_API_KEY`          | Same as local.                                                                                                                    |
| `CRON_SECRET`                    | Same as local — this is what Vercel Cron sends as a Bearer token; must match what `/api/cron/sync-standings` expects.             |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Same as local.                                                                                                                    |
| `TURNSTILE_SECRET_KEY`           | Same as local.                                                                                                                    |

Set all of these for the **Production** environment at minimum. If you also want Vercel Preview
deployments (every PR gets a URL) to work end-to-end, add them for Preview too — but note
Google OAuth and Turnstile are both origin-locked (next two sections), so previews on
ever-changing `*.vercel.app` preview URLs won't be able to sign in or pass Turnstile unless you
register a wildcard, which isn't worth the trouble for a small project. Production-only env vars
are fine to start.

## 4. Update Google OAuth for the production URL

Google OAuth checks the redirect URI against an allowlist — it will reject sign-in on the new
domain until you add it.

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials →
   your OAuth 2.0 Client ID.
2. Under **Authorized redirect URIs**, add:
   `https://<your-production-domain>/api/auth/callback/google`
3. Under **Authorized JavaScript origins**, add:
   `https://<your-production-domain>`
4. Save. (Keep the `localhost:3000` entries too — you still want local dev to work.)

## 5. Update Cloudflare Turnstile for the production domain

1. [Cloudflare dashboard](https://dash.cloudflare.com/) → Turnstile → your widget.
2. Add your production domain to the widget's allowed domains (Turnstile validates the calling
   origin — a request from an unlisted domain fails verification even with a valid token).

## 6. Deploy

Back in Vercel, click **Deploy**. First deploy will:

- Run `npm install`, which triggers `package.json`'s `postinstall` script (`prisma generate`) —
  this is required, not automatic: without it the build fails with `Module not found: Can't
resolve '@/lib/generated/prisma/...'` for every file that imports the generated client, since
  that folder is gitignored and only ever exists after `prisma generate` runs. Verified locally by
  deleting `lib/generated/prisma` and running `npm install && npm run build` from scratch.
- **Does not** run migrations automatically — see next step.

## 7. Run migrations against the production database

Since `DATABASE_URL` for prod points at the same Neon database used locally (per `qwerty.md`,
migrations are already applied there), there's nothing to run for the _first_ deploy. For any
_future_ schema change, apply the migration before or right after deploying the code that needs
it:

```bash
npx prisma migrate deploy
```

Run this from your local machine with `DATABASE_URL` pointed at the production database (or from
a one-off Vercel deployment shell). `migrate deploy` (not `migrate dev`) — it doesn't prompt and
doesn't try to generate a new migration, it just applies whatever's already in
`prisma/migrations/` that hasn't been applied yet.

## 8. Verify Vercel Cron

`vercel.json` already schedules `/api/cron/sync-standings` daily at 06:00 UTC. Vercel picks this
up automatically on deploy — no extra setup. To confirm it's registered: Vercel project →
**Settings → Cron Jobs**. Vercel attaches `CRON_SECRET` as a Bearer token automatically to
cron-triggered requests, matching what the route handler checks — nothing more to configure
there.

To test it without waiting for the schedule, use the admin "Sync now" button in the app
(`components/admin/sync-standings-button.tsx`), which hits the same underlying sync logic.

## 9. Post-deploy smoke test

Once live, before telling anyone it's ready:

- [ ] Sign in with Google on the production URL (confirms OAuth redirect URIs are right).
- [ ] Load a league page and confirm standings/crests render (confirms `DATABASE_URL` and
      `images.remotePatterns` / CSP `img-src` are right).
- [ ] Submit a guest prediction through to the Turnstile widget (confirms Turnstile site/secret
      keys and the production domain allowlist are right, and confirms CSP isn't blocking the
      Turnstile script/iframe — check the browser console for CSP violation warnings).
- [ ] Hit `/api/cron/sync-standings` via the admin "Sync now" button (confirms
      `FOOTBALL_DATA_API_KEY` and `CRON_SECRET` are right).
- [ ] Check response headers on any page (e.g. via browser devtools → Network) for
      `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` — confirms
      `next.config.ts`'s `headers()` is active in production.

If the CSP blocks something legitimate, the browser console will name exactly which directive
failed (e.g. "Refused to load the script ... because it violates the following Content Security
Policy directive: script-src") — loosen only that directive in `next.config.ts`, redeploy, and
re-check the console.

## 10. Custom domain (optional)

Vercel project → **Settings → Domains** → add your domain, follow the DNS instructions Vercel
shows (usually a CNAME or A record at your registrar). Once it's live on the custom domain,
repeat steps 3 (env vars — for `NEXTAUTH_URL`), 4, and 5 for the new domain, and keep the old
`*.vercel.app` origin registered alongside it as a fallback.

## Known gaps (as of Phase 9 kickoff)

- ~~No automated test suite~~ — `lib/scoring.test.ts` and `lib/rank-predictions.test.ts` (Vitest,
  `npm test`) now cover the scoring/rank-computation pure functions: champion/top-bracket/relegation
  points, the +5 exact-position bonus, every award category, and rank tie-breaking. Still worth
  adding coverage for other pure logic (`lib/match-team-name.ts`, `lib/normalize-name.ts`) as it
  grows.
- ~~Only Premier League has a season configured~~ — all 5 leagues now have a season with a full
  team roster, crests, and synced players.
- ~~The CSP was written by reading what loads, not tested live~~ — done: verified against a running
  dev server (sign-in, guest prediction + Turnstile, no console violations). Uses a per-request
  nonce via `middleware.ts` rather than `unsafe-inline`, since Next's own RSC hydration scripts
  needed nonce support to load under a strict `script-src`.
