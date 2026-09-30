# ChessBadger

ChessBadger is a static Astro site with Sanity content management, hosted on Cloudflare Pages.

## Development

Use Node.js 22.23.1 (pinned in `.nvmrc`), then install from the lockfile and start the development server:

```bash
nvm use
npm ci
npm run db:migrate:local
npm run dev
```

- Site: <http://localhost:4321>
- Sanity Studio: <http://localhost:4321/admin>

## Cloudflare Pages

Configure the Git-connected Pages project with:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: read from `.nvmrc`

No Cloudflare adapter is required while the site remains statically generated. Pages Functions provide the shared practice API without changing the static page rendering.

## Commands

All commands are run from the root of the project:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm ci`                  | Clean-installs dependencies from the lockfile    |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run check`           | Checks Astro, TypeScript, and component types    |
| `npm run build`           | Builds the production site to `./dist/`          |
| `npm run verify`          | Runs type checks and the production build        |
| `npm run preview`         | Previews the production build locally            |
| `npm run preview:pages`   | Builds and runs Pages Functions with local D1     |
| `npm run astro ...`       | Runs Astro CLI commands                          |
| `npm run astro -- --help` | Shows Astro CLI help                              |

## Player puzzle practice

Puzzle definitions and player-owned practice histories live in Cloudflare D1,
bound as `DB`. Players claim a unique name and a PIN; an HTTP-only signed-in session
selects which history the practice APIs read and write. There is no email or
automatic PIN recovery. Sanity continues to manage editorial content.

Puzzle pages remain static: Astro reads the catalog from D1 at build time, so
definition changes require a rebuild. Attempts, player sessions, and public progress
summaries are handled at runtime by Pages Functions. `/players` and every
`/players/{name}` URL rewrite to the same no-index player shell, so adding players
does not add generated pages or player/puzzle combinations to the build.

```bash
npm run db:migrate:local
npm run preview:pages
```

`npm run dev` serves the Astro site but does not run Pages Functions; use
`preview:pages` to verify saving and loading progress.

The schema separates collections, ordered sections, puzzle definitions, and
individual attempts. Definition JSON preserves all existing puzzle variants.
`migrations/0002_seed_puzzles.sql` is the one-time import of the removed TypeScript
data files, not a runtime data source. Do not edit an applied migration; use a new
migration or a deliberate D1 content update for subsequent changes.

Use **Do Puzzles** to practice and each section's **Attempt details** disclosure to
review the signed-in player's attempt history. Player progress pages are viewable by
anyone who knows the URL, but they are excluded from the sitemap and carry a
`noindex` directive. Only the signed-in owner can add attempts or sign out that
session.

Each puzzle records active solving time with the attempt. Students can pause and
resume the timer, restart a puzzle, or view the answer; attempt details show the
elapsed time plus pause and restart counts. The timer pauses automatically when the
tab is hidden and, after five minutes without activity, asks whether to continue.

Each attempt retains its player ID, attempt ID, puzzle, move/result, timestamp,
active solving time, pause count, and restart count. Attempts are inserted
individually, avoiding the old KV read/modify/write race. All rows are retained;
each player's API/UI window shows their latest 1,000 attempts. Anonymous attempts
remain available in the current browser session but are not written to another
player's history. Board preferences are unchanged.

### Preview deployments

`env.preview` in `wrangler.jsonc` binds the isolated `chessbadger-preview` D1
database and supplies its non-secret build settings. Configure
`CLOUDFLARE_API_TOKEN` as an encrypted **Preview** environment variable in Pages,
using an account-scoped token with D1 Read permission. Do not put tokens in Git.

Apply preview schema changes explicitly before deploying code that needs them:

```bash
npx wrangler d1 migrations apply DB --env preview --remote
```

Preview history is separate from production. The initial preview database contains
the puzzle catalog and starts with no attempts; preview testing creates its own
results. Local development still uses the local Wrangler database.

### Production migration

The top-level configuration targets the production `chessbadger` D1 database;
`env.preview` targets the separate `chessbadger-preview` database. The initial
cutover follows this runbook; future deployments keep these bindings:

1. Confirm the production `DB` binding and `CLOUDFLARE_D1_DATABASE_ID` both
   reference `0a5b99d7-8e8b-4a14-bd9b-bf6674109855`. Keep preview on its
   separate database so preview writes cannot affect production history.
2. Apply the schema/catalog: `npx wrangler d1 migrations apply DB --remote`.
   Apply player migrations before deploying code that reads player sessions.
3. Export the old KV key without deleting it:

   ```bash
   npx wrangler kv key get practice:current --namespace-id=366c836507c14c47a4af5ea805fcd590 --remote > /tmp/chessbadger-practice.json
   node scripts/import-practice.mjs /tmp/chessbadger-practice.json /tmp/chessbadger-practice.sql
   npx wrangler d1 execute DB --remote --file=/tmp/chessbadger-practice.sql
   ```

   For a local rehearsal, use `--local` on the final command. The converter
   validates the entire export before writing SQL, preserves IDs/timestamps and
   optional legacy timing fields, and never overwrites an existing output file.
   The SQL skips already-imported IDs, making repeated imports safe. Unknown
   puzzle IDs fail the foreign-key check rather than silently dropping results.
4. Configure Pages **build environment** variables:
   `PUZZLES_D1_MODE=remote`, `CLOUDFLARE_ACCOUNT_ID`,
   `CLOUDFLARE_D1_DATABASE_ID`, and a secret `CLOUDFLARE_API_TOKEN` with D1 Read
   permission for the account. These are server/build-only, never `PUBLIC_*`.
   Remote builds fail on missing credentials or an empty catalog; they do not
   silently fall back to the seed. Local builds use the local Wrangler database.
5. Arrange a brief pause in puzzle practice for the cutover. Take a fresh KV export
   and import it immediately before deploying the new Pages build; confirm no old
   deployment can still receive writes before resuming practice. Keep the KV
   namespace/export for rollback. Do not delete the KV namespace during cutover.
6. After the intended owner claims a player name, assign any imported legacy rows
   once. Replace `mike` with the claimed normalized handle:

   ```sql
   UPDATE practice_attempts
   SET player_id = (SELECT id FROM players WHERE normalized_handle = 'mike')
   WHERE player_id IS NULL;
   ```

7. Verify the deployed puzzle routes, player claim/sign-in, player isolation,
   public progress view, and a saved attempt. Compare all imported attempt IDs and
   values against D1, not just row counts. The local test suite covers catalog
   loading, SQL import, player sessions, isolation, progress summaries, and APIs:

   ```bash
   npm test
   npm run check
   npm run build
   ```

Build reads use bounded catalog queries. Avoid concurrent catalog edits during a
build so the static output represents a consistent content revision.

## Learn more

See the [Astro documentation](https://docs.astro.build) and [Cloudflare Pages Astro guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/).
