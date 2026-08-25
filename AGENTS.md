# ChessBadger project instructions

## Scope

- Preserve the site's current appearance and editorial content unless a task explicitly requests a visual or content change.
- Keep the site statically generated for Cloudflare Pages unless a feature specifically requires server-side rendering or Pages Functions.
- Treat Sanity as the source of truth for managed page, article, and game content.

## Development

- Use Node.js 22.23.1 from `.nvmrc` and npm from the `packageManager` field.
- Use `npm ci` for reproducible installs; update `package-lock.json` whenever dependencies intentionally change.
- Do not commit generated `dist/`, `.astro/`, `node_modules/`, local environment files, or secrets.

## Architecture

- Astro routes live in `src/pages/`; shared page chrome lives in `src/layouts/` and `src/components/`.
- Sanity schemas live in `schemaTypes/`; keep schema changes compatible with existing production documents.
- Use React components only where client-side interactivity is needed.
- Keep the canonical production URL in `astro.config.mjs` aligned with the deployed custom domain.

## Quality gate

- Run `npm run check` after changing Astro, TypeScript, React, schemas, or configuration.
- Run `npm run build` before handing off changes that can affect production output.
- For UI work, verify affected routes at desktop and mobile widths and check the browser console.
- For content-model changes, verify both the Sanity Studio route (`/admin`) and affected static pages.
