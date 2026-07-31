# owner-profile-mode-analytics Specification

## Purpose
TBD - created by archiving change add-owner-profile-mode-analytics. Update Purpose after archive.
## Requirements
### Requirement: Owner mode configuration uses one comparable contract

Karte SHALL emit `profile_mode_configured` after an authenticated owner
successfully saves a touched profile mode, with only the fixed project id,
mode, enabled state, and source.

#### Scenario: Chat configuration succeeds

- **WHEN** the owner successfully saves chat settings
- **THEN** Karte emits one configuration event for mode `chat` with the saved
  enabled state and source `chat_settings`

#### Scenario: Generated-mode configuration succeeds

- **WHEN** the owner changes one or more generated-mode toggles or settings and
  the Appearance save succeeds
- **THEN** Karte emits one configuration event for each touched mode and no
  event for untouched modes

#### Scenario: Configuration fails

- **WHEN** the owner API rejects or cannot complete the save
- **THEN** Karte emits no successful configuration event

### Requirement: Generated-mode completion keeps stable taxonomy

Karte SHALL route successful encyclopedia, newspaper, and roast generation
through one typed `profile_mode_generated` helper that attaches the fixed Karte
project id, mode, and stable source.

#### Scenario: Generation succeeds

- **WHEN** an owner generation request succeeds from a supported surface
- **THEN** Karte emits one generated event naming the generated mode and source

#### Scenario: Generation fails

- **WHEN** a generation request fails
- **THEN** Karte emits no generated event

### Requirement: Analytics payload remains privacy bounded

The owner profile-mode events MUST NOT contain a profile id, page id, slug,
display name, email, prompt, generated content, chat transcript, public visitor
identifier, or other private content.

#### Scenario: Event is captured

- **WHEN** Karte emits a profile-mode configuration or generation event
- **THEN** its properties contain only `project_id`, `mode`, `enabled` when
  applicable, and `source`

### Requirement: Public visitor analytics remains separate

Karte MUST keep public page views, clicks, chat interactions, and contact
events in the existing first-party visitor analytics pipeline.

#### Scenario: Public visitor uses a mode

- **WHEN** an unauthenticated visitor views or interacts with a public profile
  mode
- **THEN** this change does not emit an owner profile-mode PostHog event
