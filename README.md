# ChessBadger

ChessBadger is a static Astro site with Sanity content management, hosted on Cloudflare Pages.

## Development

Use Node.js 22.23.1 (pinned in `.nvmrc`), then install from the lockfile and start the development server:

```bash
nvm use
npm ci
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

No Cloudflare adapter is required while the site remains statically generated. Add one only if the project adopts server-side rendering or Pages Functions.

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
| `npm run astro ...`       | Runs Astro CLI commands                          |
| `npm run astro -- --help` | Shows Astro CLI help                              |

## Learn more

See the [Astro documentation](https://docs.astro.build) and [Cloudflare Pages Astro guide](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/).
