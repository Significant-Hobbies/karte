## Why

Karte records successful generated-mode actions, but those events are emitted
through several untyped call sites and chat has no comparable owner event.
PostHog therefore cannot compare authenticated configuration and generation
steps across chat, encyclopedia, newspaper, and roast without ad hoc queries.

## What Changes

- Add one typed, owner-facing profile-mode analytics contract with stable
  `mode`, `source`, and configuration/generation event shapes.
- Record successful chat configuration and touched generated-mode
  configuration after their existing owner API requests succeed.
- Route every successful encyclopedia, newspaper, and roast generation capture
  through the shared contract and fixed Karte `project_id`.
- Document the event map and its privacy boundary.
- Add focused regression tests for the emitted properties and call-site
  coverage.

## Capabilities

### New Capabilities

- `owner-profile-mode-analytics`: comparable authenticated product events for
  configuring chat/generated modes and generating shareable modes.

### Modified Capabilities

None.

## Impact

- Affects the existing browser-only PostHog helper and owner action call sites.
- Does not change public visitor analytics, persistence, profile behavior,
  provider configuration, or production deployment.
- Sends no profile identifiers, slugs, names, emails, prompts, generated
  content, chat transcripts, or visitor data.
