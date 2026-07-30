## Why

Karte's public contact form accepts unauthenticated submissions that can create
database records and analytics events, so rate limiting alone does not provide
strong bot verification. Add a narrow Turnstile gate now without changing the
contact workflow that runs after a visitor is verified.

## What Changes

- Render a managed Cloudflare Turnstile widget on every active public contact
  form.
- Include the single-use Turnstile token in the existing JSON request and reset
  the widget after each submission attempt.
- Verify the token through Cloudflare's canonical server-side `siteverify`
  endpoint before the existing contact handler runs.
- Fail closed unless verification succeeds for the `contact` action and an
  explicitly allowed hostname.
- Keep the secret in the existing Cloudflare/Infisical secret path; no secret is
  committed to source.
- Leave public chat, the dormant waitlist surface, and the backend-free shared
  Feedback package unchanged.

## Capabilities

### New Capabilities

- `turnstile-protected-contact`: Bot verification requirements for public
  contact submissions.

### Modified Capabilities

None.

## Impact

- Affects the public contact form component and `POST /api/contact/[slug]`.
- Adds a small server-side verification helper and targeted tests.
- Adds no production dependency and does not change the successful contact
  handler, database schema, or deployment topology.
- Requires `TURNSTILE_SECRET` and a production hostname allowlist in the
  existing Worker environment.
