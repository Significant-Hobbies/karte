# Performance Audit

Concrete slow paths, ordered by impact × effort.
Last audit: 2026-05-27.

## What's already been fixed

- **Dashboard layout** (was 6-8 RTTs per nav, now 2). The migration/sync logic now only runs on first dashboard load per user.
- **Analytics page** (9 sequential awaits → 1 Promise.all). 7 independent queries now run in parallel.
- **Chat widget lazy-loaded** on `/[slug]` via `next/dynamic`. 722-line client component is now code-split into its own chunk.
- **`getSession()` wrapped in React `cache()`** so multiple calls within a single request dedupe instead of re-hitting D1.

## Historical public-profile baseline

The 2026-05-27 audit measured `/karte.cc/sarthak` at:
- DNS: 1ms
- TCP: 280ms (one-time)
- TLS: 280ms (one-time, ~560ms cumulative)
- **TTFB: 1.36s** ← server processing
- Total: 1.6s

That number predates the Turso-to-D1 migration, 60-second profile-data edge
cache, chat-widget code split, and public-profile stream boundary. Treat it as
a historical baseline, not a current production measurement.

If a fresh production measurement remains slow, investigate:

1. **Cache the page response at the CF edge.** Hardest because the page
   uses `searchParams` (`?room=`, `?variant=`) and is therefore dynamic
   in Next.js's model. Options:
   - HTTP `Cache-Control: public, s-maxage=60` via middleware on profile
     paths only
   - Edge-cache via OpenNext's KV-backed cache API
   - Move searchParams handling into a client component so the page
     itself can be statically generated
2. **Verify D1 and Worker placement.** Confirm the current D1 path and Worker
   placement from production evidence rather than the old Turso assumption.
3. **Expand streaming coverage.** The public profile now streams immediately;
   other data-heavy pages can adopt the same boundary where evidence supports
   it.

Fresh p50/p75 evidence after deployment is the next decision input.

## Open issues, ordered by impact

### 🔴 1. Expand Suspense / streaming coverage

The public profile now streams a stable loading shell while D1 data resolves.
Most remaining pages still wait for all server data before sending their
content.

**Fix:** wrap data-dependent regions in `<Suspense>` with skeleton fallbacks.
The shell + sidebar + nav render immediately; data streams in as it
resolves. Especially impactful on:
- `/dashboard/analytics` (9 sequential awaits — slowest dashboard page)
- Any dashboard editor that loads heavy options

**Effort:** 30 min per page. **Impact:** huge perceived-perf win.

### 🔴 2. Analytics page: 9 sequential awaits

```
$ grep -cE '^\s+const\s+\w+\s*=\s*await\s+' src/app/dashboard/analytics/page.tsx
9
```

`/dashboard/analytics/page.tsx` has nine sequential `await` calls.
Even with sub-50ms queries, that's 450ms+ of pure serial latency.

**Fix:** audit each await — most are likely independent and could be
`Promise.all`'d into 1-2 parallel batches.

**Effort:** 1 hr. **Impact:** 5x faster analytics page load.

### 🟡 3. Most dashboard pages have 2-3 sequential awaits

Pattern is `session → page → data`:
- `links/page.tsx`, `projects/page.tsx`, `sections/page.tsx`,
  `inbox/page.tsx`, `experiments/page.tsx`, `domains/page.tsx` — all 3 awaits

These are inherently chained (`session.user.id` feeds the page lookup,
which feeds the data lookup) so full parallelization isn't possible.
But: the dashboard layout already does `getSession()` + `page lookup`.
Each page repeats this work.

**Fix:** hoist `page` lookup from layout into a shared context, pass via
React `cache()` or headers. Each dashboard page then only does 1 await for
its own data.

**Effort:** 2 hr (cross-cutting). **Impact:** -1 RTT per dashboard nav (~80-150ms).

### ✅ 4. Public profile (`/[slug]`) heavy client bundle

The chat widget (`chat-widget.tsx`) is **722 lines of client TypeScript**
that ships on every public profile, even if the visitor never opens chat.
This was previously imported synchronously at the top of the profile page.

**Status:** complete. `next/dynamic` defers the chat widget, and the page only
renders it when chat or direct messaging is enabled.

**Effort:** 30 min. **Impact:** -10-20 KB on first paint, faster TTI.

### 🟡 5. `getSession()` runs on every authenticated request

Better-auth's `getSession` hits D1 for session validation. Every dashboard
nav re-validates. The session token doesn't change between navs.

**Fix:** unstable_cache / React `cache()` keyed by the session cookie hash
for the duration of a request. Better-auth may also have a built-in cache
config we're not using.

**Effort:** 1 hr to investigate. **Impact:** -1 RTT per auth request.

### 🟢 6. Cold-start overhead on the Worker

CF Workers have ~10-50ms cold-start. First request after idle pays this.
Subsequent requests are warm.

Not actionable directly (this is platform overhead). Mitigation:
- Keep the Worker bundle small (compressing dependencies)
- Use `compatibility_flags` that avoid heavy polyfills
- Eventually consider isolating chat-widget into its own Worker via WfP

**Effort:** ongoing. **Impact:** marginal.

## Quick wins

1. **Lazy-load chat-widget** (#4) — complete
2. **Add Suspense to analytics page** (#1 + #2 together) — 1 hr
3. **Add Suspense to public profile** (#1) — complete

Fresh production measurement remains separate from these source-level fixes.

## Bigger refactors (do when you have a focused session)

4. Hoist `page` lookup from layout (#3) — touches every dashboard page
5. Cache `getSession()` (#5) — touches auth layer

## Measurement

Before declaring victory, capture before/after via:

```bash
# Cold + warm timings to a key route
curl -w "@curl-format.txt" -o /dev/null -s "https://karte.cc/dashboard/links"

# Where curl-format.txt is:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#         time_total:  %{time_total}\n
```

Also: CF Workers Analytics dashboard for actual p50/p95/p99 latencies in
production. Don't rely on cold local timing.

## Anti-goals during this pass

- Don't add caching layers that complicate cache-invalidation
- Don't introduce edge KV unless it's the actual right answer
- Don't break the existing rate-limiter binding (which provides spike protection)
- Don't lose the React Compiler benefits by adding manual memoization
