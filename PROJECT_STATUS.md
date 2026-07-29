# Karte — PROJECT STATUS

Last updated: 2026-07-25. Deeper historical detail lives at
[`docs/current/project-status.md`](docs/current/project-status.md).

## Why / What

Keep Karte available for direct personal use as a public inbound assistant:
creators publish a shareable page at `karte.cc`; visitors browse links, ask
questions, send contact/email inbounds, and arrive with enough context for a
cleaner handoff.

> **Closure (2026-07-10):** The supported posture is maintenance, reliability,
> and personally requested workflow fixes.

## Dependencies

- Cloudflare Workers/OpenNext, Turso/libSQL, `free-ai`, Knowledgebase, and the
  email/inbound delivery path.

## Timeline

- **2026-07-29** — Added an owned `/changelog` with verified, user-visible
  release outcomes and direct GitHub Roadmap and Source links.
- **2026-07-25** — Made managed Knowledgebase recall the default for indexed
  profile memory: chat no longer depends on the retired user-entered document
  key. The chat critical path uses lexical-only retrieval, skips trivial
  conversational turns, and falls back to local memory after 150 ms; semantic
  embedding misses never delay the response.
- **2026-07-25** — Restored public profile chat by replacing the gateway's
  empty streaming response path with the already-proven bounded completion
  path; a stale user-configured provider now fails over to Karte's product
  free-ai gateway with the full public profile-memory prompt, then a compact
  public-memory prompt and finally a deterministic public-bio answer instead
  of returning an empty response or 502. The existing client consumes the
  answer as a single chunk.
- **2026-07-13** — Creator Opportunity Desk shipped (approval-first partnership briefs).
- **2026-07-09** — Repositioned as a public inbound assistant; inbound email feeds Lead Radar.
- **2026-07-03** — Durable `RateLimiterDO` replaced in-memory limiter.
- **2026-07-02** — Global try/catch added to OpenNext worker.

Full timeline: [`docs/current/project-status.md`](docs/current/project-status.md).

## Products

- Public profile and inbound-assistant product at `https://karte.cc`.

## Features (shipped)

The durable feature inventory lives in
[`docs/current/project-status.md`](docs/current/project-status.md).

## Work queue

Open work is tracked only in [GitHub Issues](https://github.com/sarthakagrawal927/karte/issues).
An open issue is a to-do, a linked pull request is in progress, and merge plus
issue closure makes the work done.
