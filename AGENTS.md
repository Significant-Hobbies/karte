# AGENTS.md — Karte (linkchat)

Agent bootloader. Read this first, then `PROJECT_STATUS.md` and `docs/` for depth.

This repository is independently operable. Its tracked instructions and
commands are authoritative; no sibling Fleet checkout is required. Protect
production stability, keep changes scoped, verify work with repo-local checks,
and record durable follow-up in this repository's GitHub Issues.

## Purpose

Link-in-bio platform with AI-enhanced profile modes — chat, encyclopedia,
roast, newspaper — deployed on Cloudflare Workers via OpenNext. Product:
<https://karte.cc>. Currently in **maintenance / personal-use mode** (see
`PROJECT_STATUS.md`).

## Status + docs

- **Current/shipped product truth:** `PROJECT_STATUS.md`.
- **Open work and blockers:** GitHub Issues.
- **Docs hub:** `docs/index.md` — full navigation. Start there for any non-trivial question.
- **Detailed status record:** `docs/current/project-status.md` — timeline, products, feature inventory.
- Markdown in `docs/` is the **source of truth**. Code and executable config
  remain authoritative for implementation details and schedules.

## Stack

- Next.js 16 (App Router, React 19, **React Compiler ON**), TypeScript (strict)
- Tailwind CSS v4 (dark theme, glassmorphism, `karte-*` tokens)
- Cloudflare D1 `linkchat-auth` + Drizzle for app data and better-auth
- better-auth (Google provider + Drizzle adapter)
- Cloudflare Workers via `@opennextjs/cloudflare`; custom edge entry `worker.mjs`
- R2 (`linkchat-images`, `linkchat-cache`), Analytics Engine, `knowledgebase` RAG service binding
- Package manager: pnpm. Lint/format: Biome. Tests: Vitest + Playwright.

## Key commands

```bash
pnpm install
pnpm dev                 # next dev :3000
pnpm build               # next build --webpack
pnpm lint                # biome check .
pnpm typecheck           # tsc --noEmit
pnpm test                # vitest run
pnpm test:e2e            # playwright (needs pnpm dev on :3000)

pnpm cf:build            # full CF build (Next + critical CSS + OpenNext + Astro overlay)
pnpm deploy:cf           # cf:build + deploy to CF Workers
pnpm preview             # opennextjs-cloudflare build + local preview

pnpm db:setup:local       # local D1 schema + idempotent demo profiles
pnpm drizzle-kit generate # generate migration from schema
pnpm docs:check           # validate docs (links / frontmatter / placeholders)
```

## Critical constraints (don't violate)

- **No `middleware.ts` / `proxy.ts`** for edge guards — Next 16 proxy runs on
  Node.js, unsupported by the Cloudflare OpenNext adapter. Use `worker.mjs` /
  `worker-routing.mjs` / `agent-edge.mjs`. (ADR 0001)
- **No manual `useMemo` / `useCallback`** — React Compiler is ON. (ADR 0005)
- **No SaaS Maker RAG** as a profile-memory fallback — only the shared
  `knowledgebase` Worker. `sm*` columns are compatibility linkage only.
  (`docs/architecture/rag-memory.md`)
- **No legacy `unsafe` native ratelimit binding** — use `RateLimiterDO`.
  `rateLimit(...)` is async; callers must `await`. (ADR 0002)
- **`<Link />`, not raw `<a>`**, for internal navigation.
- **Verify migration strategy before any prod schema change.** Local setup is
  intentionally isolated from remote D1. (`docs/architecture/data.md`)
- **Don't commit secrets.** `.env*` is gitignored except `.env.example`;
  production secrets via `wrangler secret put`. (`docs/operations/env-and-secrets.md`)
- **Don't bypass the Husky pre-push hook.**
- **Deploy is manual** (`workflow_dispatch`), not on push to `main`.
  (`docs/operations/jobs.md`)

## Documentation maintenance

- **One canonical home per fact.** Link instead of restating. Don't leave two
  homes for the same fact.
- **Pages 150–300 lines.** Split long catch-alls into focused per-topic pages.
- **Don't duplicate facts easily discoverable from code.** Document *why*
  systems work, non-obvious constraints, operational procedures, decisions,
  and reusable failed approaches.
- **Don't invent information.** Track unresolved questions in GitHub Issues.
- **No empty folders or placeholder docs.** Every doc must have useful content.
- **Preserve history.** Prefer `git mv` and `docs/archive/<name>.md` over
  deletion when consolidating.
- **Validate before committing docs:** `pnpm docs:check`. Runs in CI
  (`.github/workflows/docs.yml`).
- When adding a doc, place it in the right category under `docs/` and link it
  from `docs/index.md`.

## Where to look

| Need | Go |
| --- | --- |
| Current/shipped product truth | `PROJECT_STATUS.md` |
| Open work and blockers | GitHub Issues |
| Full route + surface inventory | `docs/product/surfaces.md` |
| How a request flows / bindings | `docs/architecture/overview.md` |
| Edge worker / routing / agent edges | `docs/architecture/edge-worker.md` |
| DB / R2 / schema / migrations | `docs/architecture/data.md` |
| Env + secrets + bindings | `docs/operations/env-and-secrets.md` |
| Deploy pipeline | `docs/operations/deploy.md` |
| Decisions (ADRs) | `docs/architecture/decisions/` |
| Audits (security / perf / UI) | `docs/knowledge/audits/` |
| Failed approaches | `docs/knowledge/failed-approaches/` |
| Runbooks | `docs/operations/runbooks/` |

<!-- FLEET-GUIDANCE:START -->

## Fleet Guidance

### Adding Tasks
- Track Karte work in this repository's GitHub issues or OpenSpec changes.
- Keep reusable cross-project automation in Workflows and Skills and private
  portfolio metadata in Site Health, not SaaS Maker.

### Using SaaS Maker
- Do not use the retired SaaS Maker task queue or API as a system of record.
- Site Health owns private portfolio metadata; Workflows and Skills owns shared
  automation. Karte remains independently versioned and deployed.

### Free AI First
- Prefer free/local AI paths for routine development and analysis: the `free-ai` gateway, local models, provider free tiers, and cached context.
- Escalate to paid models only when complexity, correctness risk, or missing capability justifies the cost.
- Note any paid-AI use in the task or handoff when it materially affects cost, reproducibility, or future maintenance.

<!-- FLEET-GUIDANCE:END -->
