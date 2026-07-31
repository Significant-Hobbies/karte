## ADDED Requirements

### Requirement: Canonical public HTML inventory

The system SHALL derive its indexed public HTML routes from one shared route
contract containing the seven static pages, published profile roots, and ready
enabled profile modes.

#### Scenario: Static public routes are enumerated

- **WHEN** the sitemap is generated without database access
- **THEN** it contains `/`, `/about`, `/create`, `/faq`, `/changelog`,
  `/privacy`, and `/terms`

#### Scenario: Published profile is enumerated

- **WHEN** a published profile is loaded
- **THEN** its profile root is included in the sitemap

#### Scenario: Ready profile mode is enumerated

- **WHEN** a published profile has an enabled mode with ready generated content
- **THEN** the corresponding encyclopedia, newspaper, or roast HTML route is
  included in the sitemap

### Requirement: Non-HTML and private routes remain excluded

The system MUST NOT include authentication, onboarding, dashboard, API, JSON,
vCard, or agent discovery files in the public HTML sitemap or Markdown route
boundary.

#### Scenario: Private path requests Markdown

- **WHEN** a client requests Markdown for a reserved private or authenticated
  path
- **THEN** the system does not expose that route as a public Markdown document

#### Scenario: Machine resource is discovered

- **WHEN** an agent needs `skill.md`, `llms.txt`, `/api/ai`, a public
  `agent.json`, or another machine resource
- **THEN** it remains directly discoverable outside the public HTML sitemap

### Requirement: Every indexed route is agent-readable

The system SHALL return substantive source-backed Markdown for every public HTML
route listed in the sitemap through both `.md` alternates and
`Accept: text/markdown`.

#### Scenario: Static route requests Markdown

- **WHEN** a client negotiates Markdown for a static public route
- **THEN** the response contains the route title, canonical source URL, and
  truthful product content without requiring JavaScript

#### Scenario: Profile route requests Markdown

- **WHEN** a client requests Markdown for a published profile
- **THEN** the response contains its public bio, links, projects, sections, and
  timeline content that are available from the canonical profile loader

#### Scenario: Mode route requests Markdown

- **WHEN** a client requests Markdown for a ready enabled profile mode
- **THEN** the response contains the source encyclopedia, newspaper, or roast
  content

#### Scenario: Source is unavailable

- **WHEN** a profile is unpublished, a mode is disabled or unready, or its
  source object cannot be loaded
- **THEN** the Markdown request fails explicitly without returning an HTML
  shell or misleading success document

### Requirement: SEO metadata is complete

Every indexed public HTML route SHALL emit a self-referencing canonical URL,
concise title and description, Open Graph URL/image, and Twitter card metadata.

#### Scenario: Static page metadata is rendered

- **WHEN** a crawler reads a static public page
- **THEN** its metadata uses the matching descriptor and self-canonical route

#### Scenario: Dynamic page metadata is rendered

- **WHEN** a crawler reads a published profile or ready mode
- **THEN** its metadata names the profile and exact mode route without
  inheriting the homepage canonical

### Requirement: Agent discovery remains truthful

The system SHALL expose parseable robots rules, `llms.txt`, `/api/ai`,
homepage Markdown, and agent-native skill surfaces that accurately describe the
public route contract.

#### Scenario: Agent reads the catalog

- **WHEN** a client requests `/api/ai`
- **THEN** every bounded HTML surface has a same-origin URL and readable
  Markdown target included in the HTML sitemap

#### Scenario: Crawler reads robots rules

- **WHEN** a crawler requests `robots.txt`
- **THEN** public documents and discovery endpoints are allowed, auth/private
  families are disallowed, and the canonical sitemap is advertised

### Requirement: Coverage is regression-tested

The repository SHALL test the complete static route inventory, dynamic route
derivation, Markdown mappings, source-render behavior, catalog integrity, and
private/non-HTML exclusions.

#### Scenario: Route contract changes

- **WHEN** a route is added to the sitemap or public contract
- **THEN** tests fail until its metadata and Markdown behavior are explicitly
  covered
