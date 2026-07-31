## Why

Karte advertises agent-native discovery surfaces, but its sitemap mixes public
HTML with machine files and its Markdown contract covers only the homepage.
Published profiles and their ready AI modes therefore have incomplete SEO and
cannot be read consistently by agents without executing the human interface.

## What Changes

- Define one canonical public-HTML route contract for static pages, published
  profiles, and ready enabled profile modes.
- Generate the sitemap and Markdown route boundary from that shared contract;
  remove login, JSON manifests, downloads, and machine discovery files from the
  public HTML sitemap.
- Serve source-backed Markdown through `.md` alternates and
  `Accept: text/markdown` for every sitemap route.
- Align `robots.txt`, `llms.txt`, `/api/ai`, and agent-native skill discovery
  with the truthful public route set.
- Add self-referencing canonicals and complete social metadata for static
  pages, profiles, and profile modes.
- Regression-test full route coverage and private/non-HTML exclusions.

## Capabilities

### New Capabilities

- `public-route-coverage`: Defines Karte's indexable HTML route inventory,
  source-backed Markdown contract, metadata completeness, and exclusion rules.

### Modified Capabilities

None.

## Impact

- Affects the OpenNext edge entry, agent-edge catalog, sitemap and robots
  routes, static-page/profile metadata, and the existing public profile loader.
- Adds an internal source renderer used only to produce public Markdown.
- Does not change authentication, profile visibility, database schema,
  production dependencies, or deployment configuration.
