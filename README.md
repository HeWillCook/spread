<img src="assets/icon.svg" width="64" height="64" alt="">

# Cookout

Cookout is a phone-first party planner for backyard get-togethers. A host makes an event and shares one link; guests RSVP with no account (plus-ones included); the host turns the headcount into a menu, a shopping list with quantities and costs, and a fair split with prefilled Venmo links.

Built with Next.js (App Router), TypeScript, Tailwind 4, Drizzle on Postgres, and Better Auth for host accounts.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. No environment variables are needed: without `DATABASE_URL` the app uses an embedded [PGlite](https://pglite.dev) database stored in `.data/pglite` (git-ignored), runs the migrations on boot, and falls back to a development-only auth secret. Delete `.data/` to start fresh.

## Environment variables

Copy `.env.example` to `.env.local` when you need them.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. When unset, PGlite in `.data/pglite` is used (`PGLITE_DATA_DIR` overrides that folder; the e2e run uses it for a throwaway database). |
| `BETTER_AUTH_SECRET` | Signs host sessions. Required in production; use a long random string, e.g. `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | Public origin of the app (`http://localhost:3000` locally, `https://your-domain.com` in production). Also used to build the guest share links; when unset it is derived from the request. |

## Database

With `DATABASE_URL` set, the app does not create tables itself. Run the migrations first:

```bash
DATABASE_URL=postgres://user:password@host:5432/cookout npm run db:migrate
```

The starter recipes (currently Burgers) are seeded automatically the first time the app connects, in both PGlite and Postgres mode. The seed is idempotent. If the tables are missing the app stops with a message to run `npm run db:migrate`.

After changing `src/db/schema.ts`, run `npm run db:generate` and commit the new files in `drizzle/`.

## Tests

```bash
npm test          # unit and component tests (Vitest)
npm run lint
npm run e2e       # end-to-end flow (Playwright, mobile viewport)
```

The first time, install the browser with `npm run e2e:install`. `npm run e2e` builds the app and starts it on port 3100 with a fresh throwaway PGlite database in `.data/e2e-pglite` (wiped before each run, so your dev data is never touched), then walks through sign-up, RSVP, menu, shopping, split, and a changed RSVP.

## Deploying to Vercel

1. Create a Postgres database on [Neon](https://neon.tech) or [Supabase](https://supabase.com) and copy its connection string. Use Neon's connection string as is. On Supabase use the direct or session-pooler string (port 5432), not the transaction pooler on port 6543, because the app uses prepared statements.
2. Create the tables from your machine:
   ```bash
   DATABASE_URL="<connection string>" npm run db:migrate
   ```
3. Import the repository into Vercel (the Next.js preset needs no changes).
4. In Project Settings, Environment Variables, add `DATABASE_URL`, `BETTER_AUTH_SECRET` (a long random string), and `BETTER_AUTH_URL` (your production origin, e.g. `https://cookout.example.com`, with no trailing slash).
5. Deploy. The first request seeds the starter recipes. Re-run `npm run db:migrate` against the database whenever a deploy adds a migration.

## Venmo links

Venmo has no public API, so Cookout can only open prefilled Venmo pay links (`https://venmo.com/<username>?txn=pay&audience=private&amount=...&note=...`); it never sees or confirms a payment, and the host ticks "Paid" by hand. Venmo may change how it handles these links, so before the first real party tap "Send Venmo link" on a phone with the Venmo app installed and confirm that the username, amount, and note come through correctly.
