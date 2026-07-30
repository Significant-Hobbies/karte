## 1. Contact Widget

- [x] 1.1 Add an explicit-render Turnstile component that supports multiple
  instances, reports token lifecycle events, and exposes a reset boundary.
- [x] 1.2 Wire the widget and its single-use token into the existing public
  contact form without changing the form's successful behavior.

## 2. Server Verification

- [x] 2.1 Add a server-only canonical `siteverify` helper with timeout, strict
  action and hostname checks, and fail-closed behavior.
- [x] 2.2 Gate `POST /api/contact/[slug]` on successful verification before
  existing validation and persistence logic.
- [x] 2.3 Add focused automated coverage for accepted and rejected verification
  responses.

## 3. Configuration And Validation

- [x] 3.1 Document local public-sitekey and hostname configuration while keeping
  the secret out of tracked source.
- [x] 3.2 Store and bind `TURNSTILE_SECRET` through the existing
  Infisical/Cloudflare secret path.
- [x] 3.3 Run targeted repository checks, strict OpenSpec validation, and the
  canonical Turnstile secret/domain validation.
