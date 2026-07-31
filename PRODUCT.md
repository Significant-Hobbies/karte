# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Creators and independent operators publish a shareable public profile. Visitors
use that profile to understand the person, browse their work, ask questions,
and send a better-contextualized contact or email inbound.

## Product Purpose

Karte is a public inbound assistant. It combines a creator-owned profile,
links, projects, timeline, optional AI-generated profile modes, and direct
messaging so a visitor can move from discovery to a useful handoff.

Success in the current maintenance posture means the public profile stays fast,
reliable, understandable, and available for direct personal use.

## Positioning

The profile is not only a link list. Its owned content and optional managed
Knowledgebase memory support contextual chat and richer inbound handoffs while
keeping the creator's public identity as the source.

## Operating Context

- Public profiles are shared at `karte.cc/<slug>`.
- Creators manage profile content through the authenticated dashboard.
- Visitors can browse public sections and modes without an account.
- Cloudflare Workers/OpenNext serves the application; D1 stores app data.
- Production deployment is manual and separate from merging code to `main`.

## Capabilities and Constraints

- Public profiles support links, projects, timeline events, chat or direct
  messages, contact/email inbounds, and optional encyclopedia, roast, and
  newspaper modes.
- Public profile data is cached briefly at the Cloudflare edge.
- Karte is in maintenance and personally requested workflow-fix mode; broad
  product expansion is out of scope.
- The public profile must retain reduced-motion behavior and accessible
  semantics while loading.

## Evidence on Hand

Shipped product truth is recorded in `PROJECT_STATUS.md` and
`docs/current/project-status.md`. Route, architecture, data, and performance
contracts are documented under `docs/`; no testimonials or external benchmark
claims should be invented.

## Product Principles

1. Keep the public profile useful before adding product breadth.
2. Preserve local ownership and explicit creator control.
3. Prefer reliable, bounded fallbacks over fragile AI-only behavior.
4. Improve the visitor's path from discovery to a contextual inbound.
5. Keep `main` releasable while production deployment remains manual.

## Accessibility & Inclusion

Public routes should preserve semantic landmarks, keyboard access, readable
contrast, responsive behavior, and reduced-motion support.
