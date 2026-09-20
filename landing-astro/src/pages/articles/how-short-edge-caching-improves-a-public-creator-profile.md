---
layout: ../../layouts/Article.astro
title: "How short edge caching improves a public creator profile"
description: "Learn how Karte uses short edge caching on Cloudflare Workers to keep public profiles fast and reliable without sacrificing dynamic capabilities."
date: "2026-09-20"
author: "Sarthak Agrawal"
readingMinutes: 6
---

## The Architecture: Workers, OpenNext, and D1

Karte operates fundamentally as a public inbound assistant. Rather than relying on traditional Node.js servers, it is deployed on Cloudflare's edge network using Cloudflare Workers. The Next.js framework is bridged to this environment via OpenNext, utilizing Cloudflare D1 for SQLite database storage and Durable Objects for distributed, consistent rate limiting. Visitors can access these public profiles without an account, but the page itself must dynamically resolve a complex web of data: active links, chronological project timelines, and managed Knowledgebase memory used for the AI chat modes.

When a visitor lands on a route like `karte.cc/[slug]`, they are not simply requesting a pre-rendered, static HTML file from a CDN bucket. The request routes initially through a custom edge layer—specifically `worker.mjs` and `worker-routing.mjs`—before hitting the Next.js Server-Side Rendered (SSR) application. This server-side resolution ensures that the initial HTML payload delivered to the browser is complete, semantically accessible for screen readers, and fully populated for agent ingestion (such as LLMs or search crawlers).

## The Caching Problem: Why Long Caches Fail Inbound Assistants

Traditional caching strategies, especially those applied to marketing sites or blogs, often default to very long time-to-live (TTL) values. These values might span hours, days, or even weeks, operating on the assumption that content rarely changes. When changes do occur, the system relies on complex cache invalidation logic—webhook triggers or manual purges—to clear the outdated content across a distributed Content Delivery Network (CDN).

This approach works exceptionally well for static content but introduces severe complications for an inbound assistant like Karte.

If caching is configured to be too aggressive (long TTL):
*   **Stale Creator Updates:** When a creator updates their profile—perhaps adding a new, time-sensitive calendar booking link, correcting a typo in a project description, or deactivating a deprecated section—those changes take far too long to propagate. Visitors might see outdated information, leading to broken handoffs or confusion.
*   **Dynamic Feature Conflicts:** Aggressive caching can conflict with features that require real-time state evaluation. For example, authenticated rate limits (which Karte backs with a `RateLimiterDO` Durable Object) or single-use Turnstile challenges for contact forms can fail or behave unpredictably if the underlying page or configuration is served directly from a stale cache.

Conversely, if caching is completely bypassed (no TTL):
*   **Latency and Database Load:** Every single visitor request must traverse the network to the origin worker, invoke the Next.js SSR process, and execute queries against the D1 database. This significantly increases end-to-end latency and multiplies database reads.
*   **Vulnerability to Spikes:** A sudden surge in traffic—perhaps a creator goes viral on social media—could degrade performance across the platform, especially since Next.js SSR involves substantially more computational overhead compared to serving a static asset.

## The Short Edge Cache Solution

Karte's solution to this dilemma is a strictly enforced **short edge cache**. By caching public profile data very briefly at the Cloudflare edge, the system achieves a highly effective compromise.

The short edge cache absorbs the brunt of traffic spikes and delivers near-instant Time to First Byte (TTFB) for concurrent visitors located in the same geographic region. If fifty people click a profile link simultaneously in New York, the first request warms the cache, and the subsequent forty-nine requests are served immediately from the edge node, bypassing the D1 database entirely.

However, because the cache window is intentionally brief, creator updates become visible to new visitors very quickly. The system does not require complex, brittle manual cache invalidation logic across the global network. When the short TTL expires, the next request simply fetches the fresh data, naturally healing the cache with the latest state.

## Concrete Examples in Practice

To fully understand the impact of short edge caching, it's helpful to consider how it interacts with Karte's specific features in production.

### The Stable Loading Shell

As documented in the project's development history (specifically the July 31, 2026 update), Karte implemented a stable loading shell specifically for uncached public profiles.

When a visitor requests a profile that isn't currently warm in the edge cache (a cache miss), the worker doesn't force the visitor to stare at a blank screen while the Next.js application queries the D1 database. Instead, the edge worker immediately streams a stable, semantically accessible HTML shell to the browser.

This technique ensures that the perceived performance remains exceptionally high even on a cache miss. The visitor sees the structure and branding of the page instantaneously, and the actual dynamic content fills in milliseconds later once the database resolution completes. Subsequent requests that hit the short edge cache bypass this process entirely, receiving the fully populated HTML directly from the edge.

### Guarding Dynamic Actions

While the core, read-heavy profile content benefits immensely from edge caching, specific write-heavy actions *must absolutely* bypass the cache to function securely and correctly. Karte handles this by explicitly separating these concerns at the routing layer.

For example, consider the **Public Profile Chat** and **Contact Submissions**:
*   The interactive chat system relies on bounded per-profile and per-IP limits, which are strictly enforced by a Durable Object. It also utilizes server-verified Cloudflare Turnstile challenges to prevent automated abuse.
*   Similarly, contact form submissions fail closed unless a canonical, server-side Turnstile verification succeeds for the expected action and hostname.

These dynamic, state-mutating endpoints (`/api/chat/[slug]` and `/api/contact/[slug]`) are configured to explicitly bypass the edge cache. The architecture intelligently applies caching to the static representation of the profile while guaranteeing that interactive features always evaluate current, authoritative state.

### Agent and LLM Entrypoints

Modern public profiles aren't just for human visitors; they are increasingly crawled and ingested by AI agents and Large Language Models. Karte provides specific, machine-readable entrypoints for this purpose, including a structured LLM index (`/llms.txt`), an expanded agent brief, and a pure Markdown rendering of the homepage (`/index.md`).

These machine-readable surfaces benefit tremendously from short edge caching. When an automated crawler requests the profile, it receives a fast, clean text response without waking up the entire application stack or triggering unnecessary database reads. When the creator updates their bio or project history, the short cache ensures the agent index receives the updated context relatively quickly during its next scheduled crawl, maintaining an accurate representation across AI platforms.

## Next Action

If you are building a Next.js application deployed on Cloudflare Workers (whether via OpenNext or alternative adapters), take time to review your routing and caching layer. Ensure your `Cache-Control` headers for public-facing profiles specify a short `s-maxage` directive tailored for the edge, potentially combined with a `stale-while-revalidate` instruction. This pattern keeps the page incredibly fast for concurrent visitors while allowing background updates to keep the content fresh and accurate without manual intervention.
