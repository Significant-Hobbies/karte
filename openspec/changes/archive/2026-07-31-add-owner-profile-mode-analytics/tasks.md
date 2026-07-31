## 1. Analytics contract

- [x] 1.1 Add typed profile mode, source, configuration, and generation helpers
  to the owner-facing PostHog module.
- [x] 1.2 Add focused tests for fixed project taxonomy, allowed properties, and
  all owner call sites.

## 2. Owner action instrumentation

- [x] 2.1 Capture successful chat configuration.
- [x] 2.2 Capture only touched generated-mode configuration after a successful
  Appearance save.
- [x] 2.3 Normalize every successful generated-mode capture through the shared
  helper without changing user flow.

## 3. Documentation and delivery

- [x] 3.1 Update the analytics event map and durable project status.
- [x] 3.2 Run focused tests, lint, typecheck, docs validation, and strict
  OpenSpec validation.
- [x] 3.3 Archive the OpenSpec change and deliver through a pull request that
  closes GitHub issue #45.
