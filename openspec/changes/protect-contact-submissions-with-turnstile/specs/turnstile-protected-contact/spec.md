## ADDED Requirements

### Requirement: Contact form issues a Turnstile token
Every active public contact form SHALL render a managed Turnstile widget for
the `contact` action and SHALL include its token in the existing contact
request.

#### Scenario: Visitor completes the challenge
- **WHEN** Turnstile returns a token for an active contact form
- **THEN** the form enables submission and includes that token in its JSON body

#### Scenario: Challenge is incomplete or expires
- **WHEN** no current Turnstile token exists
- **THEN** the form prevents the contact request and requires verification

### Requirement: Contact submissions use single-use tokens
The client SHALL discard and reset the Turnstile token after every contact
request attempt.

#### Scenario: Visitor retries after a response
- **WHEN** a contact request completes successfully or unsuccessfully
- **THEN** the widget resets and the visitor must obtain a fresh token before
  retrying

### Requirement: Backend verifies contact tokens
The contact API SHALL verify each token through Cloudflare's canonical
server-side `siteverify` endpoint before the existing contact handler runs.

#### Scenario: Verification succeeds
- **WHEN** `siteverify` returns `success === true`, action `contact`, and a
  hostname in the configured allowlist
- **THEN** the API continues through the existing validation and persistence
  behavior

#### Scenario: Verification fails closed
- **WHEN** the token or server configuration is missing or malformed,
  `siteverify` fails, or the returned success, action, or hostname is invalid
- **THEN** the API returns a forbidden response and does not run the existing
  contact handler

### Requirement: Turnstile secret remains server-only
The Turnstile secret MUST be read from the existing server secret environment
and MUST NOT be included in tracked source or browser code.

#### Scenario: Browser renders the widget
- **WHEN** the contact form loads
- **THEN** it receives only the public sitekey and cannot access the Turnstile
  secret
