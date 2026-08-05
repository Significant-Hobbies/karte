# ai-link-in-bio-intent-page Specification

## Purpose
Define the canonical, source-backed AI link-in-bio guide and keep its human,
agent-readable, discovery, and production-routing surfaces consistent.
## Requirements
### Requirement: Canonical AI link-in-bio guide

The system SHALL publish a substantive, self-canonical public HTML page at
`/ai-link-in-bio` for creators, independent professionals, AI-agent operators,
and evaluators comparing conventional link routing with a source-bounded
conversational profile.

#### Scenario: Visitor evaluates the category

- **WHEN** a visitor opens `/ai-link-in-bio`
- **THEN** the page explains the interaction model, intended audience, useful
  questions, creation workflow, sources, limitations, and one primary profile
  drafting action without requiring JavaScript

### Requirement: Comparison remains honest and bounded

The page SHALL compare conventional and conversational profiles by interaction
pattern and SHALL state when a conventional link page is sufficient. It MUST
NOT claim that competitors are incapable, inferior, or static-only.

#### Scenario: Conventional routing is the better fit

- **WHEN** a visitor only needs a curated set of destinations
- **THEN** the page says that a conventional link-in-bio may be enough

#### Scenario: A competitor capability is described

- **WHEN** the page mentions Linktree links or embedded apps
- **THEN** it cites current first-party Linktree documentation and limits the
  distinction to choosing destinations versus asking a source-bounded question

### Requirement: Trust and privacy limitations are visible

The page SHALL visibly explain that a trust card and operator URL are public
declarations, not verified identity, that domain verification and verified
badges are not currently shipped, and that AI answers can be inaccurate. It
SHALL distinguish published profile/interaction data from owner-only settings,
credentials, private profiles, inbox data, and visitor transcripts.

#### Scenario: Visitor evaluates an agent trust card

- **WHEN** the visitor reads about `agent.json`
- **THEN** the page identifies supported declaration fields and tells the
  visitor to check verification fields and first-party operator sources

#### Scenario: Owner prepares public content

- **WHEN** the owner reads the privacy boundary
- **THEN** the page warns against putting secrets in public profile fields or
  source material used for public answers

### Requirement: Human and agent renderings share one source

The system SHALL derive the route's substantive HTML and Markdown from one
shared content module. `/ai-link-in-bio.md` and `Accept: text/markdown` on the
canonical route SHALL return 200, substantive source-backed Markdown, and a
canonical Link header without returning an application shell.

#### Scenario: Agent requests the explicit Markdown route

- **WHEN** an agent requests `/ai-link-in-bio.md`
- **THEN** it receives the guide's comparison, privacy and trust limitations,
  sources, FAQ, and CTA as Markdown

#### Scenario: Agent negotiates Markdown

- **WHEN** an agent requests `/ai-link-in-bio` with `Accept: text/markdown`
- **THEN** it receives the same authored Markdown document and canonical source
  URL

### Requirement: Discovery surfaces enumerate the route once

The system SHALL include `/ai-link-in-bio` and its Markdown alternate exactly
once and consistently in the HTML sitemap, `/api/ai`, `llms.txt`, the expanded
llms index, and source fallbacks.

#### Scenario: Discovery catalog is generated

- **WHEN** sitemap and agent discovery artifacts are built or requested
- **THEN** the guide's canonical HTML URL and correct same-origin Markdown URL
  are present without duplicate or private routes

### Requirement: Structured data matches visible content

The page SHALL emit parseable WebPage, BreadcrumbList, and FAQPage JSON-LD. The
WebPage canonical SHALL be `https://karte.cc/ai-link-in-bio`, breadcrumbs SHALL
be Karte then AI link-in-bio, and every FAQ answer SHALL be visible verbatim.

#### Scenario: Search crawler parses the page

- **WHEN** a crawler reads the rendered HTML
- **THEN** all three supported schema types parse and contain no hidden claims

### Requirement: Existing routes provide contextual discovery

The homepage and FAQ SHALL each contain one contextual link to the guide while
preserving existing primary navigation labels, wordmark, analytics identifiers,
legal copy, and product behavior.

#### Scenario: Visitor needs deeper category guidance

- **WHEN** a visitor reads the homepage or a related FAQ answer
- **THEN** they can follow a contextual link to `/ai-link-in-bio`

### Requirement: Production routes the Astro document explicitly

The Worker SHALL classify `/ai-link-in-bio` as both a cacheable exact document
and an Astro static-asset path so the canonical guide is served before the
dynamic profile-slug catch-all.

#### Scenario: Visitor opens the canonical guide in production

- **WHEN** the Worker receives a GET request for `/ai-link-in-bio`
- **THEN** it serves the overlaid Astro document with the existing static cache
  behavior rather than resolving `ai-link-in-bio` as a user profile slug

### Requirement: Route coverage is regression-tested

The repository SHALL test the exact eight-route static inventory, Worker
static-asset and cache routing, substantive Markdown behavior, API catalog
integrity, structured metadata expectations, and exclusion of private and
non-HTML routes.

#### Scenario: Public route contract drifts

- **WHEN** a route, Markdown mapping, or catalog record is added, removed, or
  changed inconsistently
- **THEN** the targeted contract tests fail before merge

#### Scenario: Worker routing allowlists drift

- **WHEN** `/ai-link-in-bio` is removed from either the cacheable-document or
  Astro static-asset set
- **THEN** the targeted contract tests fail before merge
