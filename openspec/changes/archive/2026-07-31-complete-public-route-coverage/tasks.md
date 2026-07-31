## 1. Public Route Contract

- [x] 1.1 Add the portable static-route, profile-mode, reserved-path, and
  Markdown mapping contract.
- [x] 1.2 Refactor sitemap and robots generation to use the contract and include
  only published HTML with ready enabled modes.
- [x] 1.3 Serve Astro-owned `/`, `/faq`, and `/changelog` assets consistently
  before the Next catch-all.

## 2. Source-Backed Markdown

- [x] 2.1 Add source renderers for static pages, published profiles, and ready
  encyclopedia, newspaper, and roast content.
- [x] 2.2 Integrate `.md` alternates and `Accept: text/markdown` at the Worker
  boundary with explicit failures for unavailable/private sources.
- [x] 2.3 Align `llms.txt`, `/api/ai`, and agent-native discovery with real
  same-origin Markdown targets.

## 3. SEO Metadata

- [x] 3.1 Add shared static and profile metadata helpers with self-canonicals,
  social URLs/images, and Twitter cards.
- [x] 3.2 Apply complete metadata to every Next static page, public profile,
  and profile mode.
- [x] 3.3 Fix Astro FAQ/changelog canonical and heading metadata while
  preserving their existing visual design.

## 4. Verification

- [x] 4.1 Add tests for full static/dynamic route derivation, Markdown mapping,
  catalog integrity, and private/non-HTML exclusion.
- [x] 4.2 Run lint, typecheck, unit tests, production/OpenNext builds, docs
  checks, and strict OpenSpec validation.
- [x] 4.3 Run representative local SEO and full local GEO audits, record their
  outputs, and verify the final diff.
