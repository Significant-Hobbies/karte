# Local setup

## Prerequisites

- Node.js 22+ (the app CI uses 22).
- pnpm 10+ (`packageManager` is pinned in `package.json`).
- Wrangler (installed with the project dependencies).

## First run

```bash
pnpm install
cp .env.example .env.local        # then fill in the values
pnpm db:setup:local               # local D1 schema + four demo profiles
pnpm dev                          # http://localhost:3000
```

`db:setup:local` uses `wrangler.local.jsonc`, applies only
`migrations/d1/*.sql`, and refuses `--remote`. Re-running it is safe: Wrangler
tracks applied migrations and the demo seed replaces only its dedicated demo
records.

## Required env vars

See `docs/operations/env-and-secrets.md` for the full reference. The minimum
for a working local app:

- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `BETTER_AUTH_URL` — e.g. `http://localhost:3000`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth client
- `NEXT_PUBLIC_APP_URL` — public origin used in links + emails
- `LINKCHAT_DEFAULT_AI_API_KEY` — fallback AI key for chat
- `RAG_SERVICE_KEY` — required for profile-memory indexing/search

## Common commands

```bash
pnpm dev                # next dev
pnpm build              # next build --webpack
pnpm lint               # biome check .
pnpm typecheck          # tsc --noEmit
pnpm test               # vitest run
pnpm test:e2e           # playwright (assumes pnpm dev on :3000)
pnpm preview            # opennextjs-cloudflare build + local preview
pnpm docs:check         # validate docs (links, frontmatter, placeholders)
pnpm db:setup:local     # rebuild/refresh local D1 fixtures
```

Full command list: `docs/development/scripts.md`. Deploy: `docs/operations/deploy.md`.
