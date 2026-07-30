## Context

The client-side `ContactFormSection` submits JSON to the existing Next.js
`POST /api/contact/[slug]` route and stays mounted after both successful and
failed requests. The route already rate-limits by visitor IP before validating
and storing the message. Karte runs through OpenNext on the existing Cloudflare
Worker, so server-side verification can call Turnstile directly without new
infrastructure or dependencies.

## Goals / Non-Goals

**Goals:**

- Require a fresh Turnstile token for each contact submission.
- Validate the token on Karte's backend before any existing contact behavior.
- Bind verification to the `contact` action and an environment-configured
  production hostname allowlist.
- Fail closed on missing configuration, malformed tokens, network errors,
  non-2xx responses, or negative verification results.

**Non-Goals:**

- Protect chat requests or the dormant waitlist surface.
- Add a backend to the shared Feedback package.
- Change contact validation, persistence, analytics, or delivery behavior.
- Add dependencies, infrastructure, or deploy the change.

## Decisions

1. Use Turnstile's explicit JavaScript API in a small client component. Multiple
   contact forms can coexist on a page, so each instance retains its own widget
   ID and token.
2. Reset the widget and clear the token after every request attempt because
   Turnstile tokens are single-use. A retry cannot reuse a redeemed token.
3. Keep the public sitekey in source-backed public configuration and the secret
   exclusively in the existing Cloudflare/Infisical secret path. The sitekey is
   intentionally public; the secret never reaches the browser.
4. Put canonical `siteverify` logic in a server-only helper. It posts
   URL-encoded `secret`, `response`, and `remoteip`, uses a ten-second timeout,
   and accepts only `success === true`, exact action `contact`, and an allowed
   hostname.
5. Preserve the current contact route after the verification gate. Existing
   rate limiting stays first to cheaply shed abusive traffic before the
   outbound verification call.

## Risks / Trade-offs

- [Cloudflare challenge or network outage blocks contact submissions] →
  Deliberately fail closed and display the existing inline error path.
- [A consumed token is submitted again] → Reset the widget after every
  submission attempt and disable submission until a new token is issued.
- [Production hostname configuration drifts] → Validate against
  `TURNSTILE_HOSTNAMES` and run the canonical widget-domain validation.
- [The widget script fails to load] → Keep submission disabled and surface an
  accessible verification error from the widget component.

## Migration Plan

1. Add and test the client widget and server gate.
2. Store `TURNSTILE_SECRET` in Infisical and bind it to the existing `linkchat`
   Worker; set the production hostname allowlist to `karte.cc`.
3. Run the canonical dummy-token and widget-domain validation.
4. Deploy through Karte's normal manual release process after review.

Rollback removes the widget and server gate and unbinds the secret; no data
migration is involved.

## Open Questions

None.
