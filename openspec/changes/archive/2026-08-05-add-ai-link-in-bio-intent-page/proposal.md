## Why

Karte explains its public inbound-assistant model across the homepage, FAQ,
privacy policy, and agent skill, but it does not have one substantive page for
the evaluation intent “AI link-in-bio” or “conversational profile.” Creators,
independent professionals, AI-agent operators, and evaluators need a single
source-backed comparison that explains when conversational discovery is useful,
when a conventional link page is enough, and which claims are declarations
rather than verified identity.

## What Changes

- Add a canonical public HTML route at `/ai-link-in-bio` with a shared content
  source, one primary profile-drafting CTA, a conventional-versus-conversational
  comparison, supported workflows, and visible privacy and trust-card limits.
- Publish matching source-backed Markdown through `/ai-link-in-bio.md` and
  `Accept: text/markdown`.
- Register the route in the sitemap, `/api/ai`, `llms.txt`, the expanded index,
  and the portable public-route contract.
- Route the generated Astro document through the Worker's explicit static-asset
  and cacheable-document allowlists so `/ai-link-in-bio` cannot fall through to
  the dynamic profile-slug handler.
- Add WebPage, BreadcrumbList, and FAQPage JSON-LD whose claims and answers are
  visible on the page.
- Add contextual internal discovery links from home and FAQ without changing
  primary navigation labels.
- Cover the eighth static route, Markdown substance, catalog integrity, and
  private/non-HTML exclusions with regression tests.

## Capabilities

### New Capabilities

- `ai-link-in-bio-intent-page`: Defines Karte's owned evaluation and workflow
  page for AI link-in-bio and conversational-profile intent.

### Modified Capabilities

- `public-route-coverage`: Extends the canonical static route inventory from
  seven routes to eight and requires the new route's discovery companions.

## Scope Boundaries

- Product claims must remain supported by Karte's current public route
  contract, agent skill, privacy policy, and source repository. The comparison
  may cite current first-party Linktree documentation, but it must not claim a
  competitor is incapable or inferior.
- An operator URL or trust card is a declaration, not verified identity.
  Domain verification and verified badges remain unshipped.
- The FAQ remains the compact long-tail question reference. The new page owns
  category comparison and workflow evaluation intent, avoiding duplicate or
  competing copy.
- No database, schema, authentication, agent API, chat behavior, analytics
  identifier, rate limit, pricing, credential, dependency, or production
  configuration changes are included.

## Impact

- Affects the Astro public landing, shared public-route content/Markdown
  contract, explicit Worker static-asset routing, edge fallbacks, discovery
  files, route tests, and product-surface documentation.
- Production deployment remains a separate, manual GitHub Actions step after a
  reviewed and green merge. The deployed Worker must be tagged with the exact
  40-character merged main revision.
