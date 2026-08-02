# Scripts inventory

All scripts live in `package.json` `scripts`. Helper scripts live in
`scripts/`.

## npm scripts

| Script | What it does |
| --- | --- |
| `dev` | `next dev` |
| `build` | `next build --webpack` |
| `start` | `next start` |
| `lint` | `biome check .` |
| `typecheck` | `tsc --noEmit` |
| `test` / `test:watch` / `test:coverage` | Vitest unit |
| `test:e2e` / `test:e2e:ui` | Playwright |
| `smoke:agent` | `node scripts/smoke-agent-api.mjs` |
| `smoke:profile-memory` | `node scripts/smoke-profile-memory.mjs` |
| `backfill:aggregates` | repopulate daily aggregates from `pageEvents`; local D1 by default, explicit `--remote` for production |
| `enrich:profile` | enrich one profile from attached links; local D1 by default, explicit `--remote` for production |
| `preview` | opennextjs-cloudflare build + local preview |
| `cf:build` | full CF build pipeline (see `docs/operations/deploy.md`) |
| `deploy:cf` | `cf:build` + `opennextjs-cloudflare deploy` |
| `upload:cf` | `cf:build` + `opennextjs-cloudflare upload` |
| `format` / `format:check` | biome format |
| `check` | `biome check .` |
| `docs:check` | validate docs (links / frontmatter / placeholders) |
| `db:setup:local` | apply all D1 migrations locally and load four idempotent demo profiles |

## `scripts/` directory

| File | Role |
| --- | --- |
| `backfill-aggregates.mjs` | Aggregate backfill from historical `pageEvents` through the D1 command boundary. |
| `enrich-profile-from-links.mjs` | Auto-enrich a profile from its links through the D1 command boundary. |
| `lib/d1-command.mjs` | Local-by-default Wrangler D1 query/file execution shared by operator scripts. |
| `enrich-sarthak.mjs` | Owner-profile enrichment variant. |
| `extract-claude-design.mjs` | Extract design tokens from the Claude design deck. |
| `inline-critical-css.mjs` / `run-inline-critical-css.mjs` | Beasties critical-CSS inlining step in `cf:build`. |
| `overlay-astro-landing.mjs` / `run-overlay-astro-landing.mjs` | Overlay the Astro landing onto the Next.js output in `cf:build`. |
| `setup-local-d1.mjs` | Local-only migration and demo-fixture setup; rejects remote access. |
| `seed-agent-demo.mjs` / `seed-demos.mjs` | Emit demo data SQL. |
| `smoke-agent-api.mjs` / `smoke-profile-memory.mjs` | Smoke tests. |
| `test-import.mjs` | Import-path test harness. |
| `predeploy-agent-trust-cards.sh` | Pre-deploy hook for agent trust cards. |
| `docs-check.mjs` | Documentation validator (see `docs/operations/jobs.md`). |
