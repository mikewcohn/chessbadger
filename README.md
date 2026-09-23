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

## Shared puzzle practice

Puzzle definitions and the single shared practice history live in Cloudflare D1,
bound as `DB`. There are no accounts or per-user records. Sanity continues to manage
editorial content. Puzzle pages remain static: Astro reads the catalog from D1 at
build time, so definition changes require a rebuild. Attempts are read and written
at runtime by Pages Functions.

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

Each attempt retains its ID, puzzle, move/result, timestamp, active solving time,
pause count, and restart count. Attempts are inserted individually, avoiding the
old KV read/modify/write race. All rows are retained; the existing API/UI window
still shows the latest 1,000 attempts. Progress remains shared and calculated from
that window. Existing browser result caching and board preferences are unchanged.

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

### Production migration (not performed by preview setup)

The top-level database ID remains a local-only placeholder; `env.preview`
overrides it only for preview deployments. Production D1 setup is still required
before merging/deploying this migration to `main`. Before deploying:

1. Create a D1 database with `npx wrangler d1 create chessbadger`. Replace the
   placeholder `database_id` in `wrangler.jsonc` with the returned ID. Configure
   production and preview `DB` bindings intentionally; use a separate preview
   database if preview writes should not affect the shared production history.
2. Apply the schema/catalog: `npx wrangler d1 migrations apply DB --remote`.
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
6. Verify the deployed puzzle routes, both practice GET endpoints, and a saved
   attempt. Compare all exported attempt IDs and values against D1, not just row
   counts. The local test suite covers catalog loading, SQL import, and APIs:

   ```bash
   npm test
   npm run check
   npm run build
   ```

Build reads use bounded catalog queries. Avoid concurrent catalog edits during a
build so the static output represents a consistent content revision.

## Learn more

See the [Astro documentation](https://docs.astro.build) and [Cloudflare Pages Astro guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/).
