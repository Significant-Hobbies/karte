# Edge worker + routing

`worker.mjs` is the custom Worker entry (`wrangler.jsonc` `"main": "worker.mjs"`)
that wraps the OpenNext-generated handler. It runs **before** Next.js for every
request and owns concerns that Next.js middleware cannot handle on the
Cloudflare OpenNext runtime.

## Why a custom entry, not Next.js middleware/proxy

Next 16's `proxy.ts` (formerly `middleware.ts`) runs on the Node.js runtime,
which the Cloudflare OpenNext adapter does not support. All request-time
guards that must run at the edge — dashboard redirects, custom-domain
rewrites, landing fast path, profile cache headers, agent indexing surfaces —
live in `worker.mjs` / `worker-routing.mjs` / `agent-edge.mjs` instead.

> **Do not reintroduce `middleware.ts` / `proxy.ts` for these guards.**
> See ADR `docs/architecture/decisions/0001-edge-worker-over-middleware.md`.

## Files

| File | Role |
| --- | --- |
| `worker.mjs` | Entry. Re-exports Durable Object classes, wraps the OpenNext handler with `caches.default` for cacheable GETs, global try/catch, timing, Markdown negotiation, and pre-OpenNext routing. |
| `worker-routing.mjs` | `routeBeforeOpenNext()`, `addProfileCacheHeaders()`, `hasAuthCookie()`, custom-hostname → `/<slug>` rewrite, reserved-segment guard, host cache. |
| `agent-edge.mjs` | `handleAgentEdge()` — serves `llms.txt`, `llms-full.txt`, `/api/ai`, `robots.txt` and other fleet GEO agent-indexing surfaces before OpenNext. |
| `public-route-contract.mjs` | Canonical static HTML inventory, profile-mode readiness, robots rules, and HTML-to-Markdown path mapping shared by sitemap, metadata, and the edge. |
| `public-route-markdown.mjs` | Maps `.md` and `Accept: text/markdown` requests to source-backed renderers before the normal HTML response. |
| `rate-limiter-do.mjs` | `RateLimiterDO` Durable Object backing `src/lib/rate-limit.ts`. |
| `timing.mjs` | `withTiming()` wrapper for request timing. |

## The edge never owns `/api/*` it did not declare

`agent-edge.mjs` is a **strict pre-handler**. It answers only for the exact
paths in its `EXACT_ROUTES` allow-list (`/llms.txt`, `/llms-full.txt`,
`/index.md`, `/robots.txt`, `/openapi.json`, `/openapi.yaml`, `/api/ai`) and
returns `null` for everything else, so the request reaches OpenNext. It must
never conclude that a path does *not* exist — only Next.js knows the route
table.

The JSON error envelope for unknown API paths is a **post-handler**,
`withApiJsonNotFound(request, response)`, applied in `worker.mjs` to the
response coming back from OpenNext: only when Next.js itself answers 404 for an
`/api/*` path does the HTML error page become
`{"error":{"code":"not_found",…}}`. A route handler's own JSON 404 is left
untouched.

> **Carry-forward when regenerating `agent-edge.mjs`.** This file is a
> copied/generated fleet artifact (see its header and the
> `apply-agent-surfaces` payload marker). The upstream template's `/api/*`
> catch-all 404 shadowed every real Next.js route handler in production —
> `GET /api/pages` returned the edge's `not_found` envelope while `POST` to the
> same path reached its handler. Regenerating from an unfixed template
> reintroduces the outage. `tests/agent-edge-api-routing.unit.test.mjs` fails
> loudly if it comes back; do not "fix" it by narrowing the test.

## Cacheable document paths

`worker.mjs` keeps a `CACHEABLE_EXACT` set of landing/marketing document paths
(`/`, `/about`, `/create`, `/faq`, `/changelog`, `/welcome`, `/login`,
`/privacy`, `/terms`) served
from `caches.default` on warm hits, skipping the OpenNext cold-start path
entirely. Dynamic `/{slug}` profiles are **not** cached at this layer; they get
profile cache headers from `addProfileCacheHeaders()` instead.

The Astro build overlays `/`, `/faq`, and `/changelog` into
`.open-next/assets`. The Worker serves those three exact paths from the assets
binding before the Next catch-all can interpret FAQ or changelog as profile
slugs.

## Cache headers

- Static marketing documents: `public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800`
- Public profiles: `public, s-maxage=60, stale-while-revalidate=300`
- Authenticated requests (session cookie present) bypass profile caching.

Headers are explicit because s-maxage-only was being marked `DYNAMIC` at the
zone level; using `caches.default` sidesteps the zone-level Cache Rules
requirement.

## Custom hostname rewrite

For non-app hosts (`Host` not in `KARTE_APP_HOSTS`), `routeBeforeOpenNext`
calls `resolveSlugForHost()` (`src/lib/page-domains.ts`, 60s in-memory cache)
against the `pageDomains` table and rewrites the request URL to `/<slug>`.
Reserved first segments (`api`, `_next`, `dashboard`, `login`, `create`,
`about`, `privacy`, `terms`, …) are never treated as slugs.

See `docs/product/custom-domains.md` for the full custom-domain flow and the
known platform limitation (verified hostnames return 522 until an architecture
migration).

## Durable Object re-exports

`worker.mjs` re-exports `BucketCachePurge`, `DOQueueHandler`,
`DOShardedTagCache` (from OpenNext) and `RateLimiterDO` (from
`rate-limiter-do.mjs`) because wrangler requires the configured entrypoint to
export the DO classes referenced by bindings.
