## Context

Karte intentionally separates two analytics systems:

- PostHog measures authenticated owner product usage.
- The first-party `/api/track` pipeline measures anonymous public profile
  behavior for creator dashboards.

The existing `profile_mode_generated` event is captured directly from five
components. It already carries `mode`, but it does not consistently carry
Karte's fixed project taxonomy or a stable source, and chat has no comparable
configuration signal.

## Goals / Non-Goals

**Goals:**

- Make configuration comparable across all four product modes.
- Preserve the existing generated-mode event name for continuity.
- Emit success events only after the existing owner API request succeeds.
- Keep the allowed payload closed to low-cardinality product taxonomy.

**Non-Goals:**

- Track public visitors in PostHog.
- Capture profile, user, prompt, content, or conversation fields.
- Add server-side PostHog, dashboards, feature flags, or provider changes.
- Infer whether a public mode was read or whether a chat was useful.

## Decisions

### Use two stable event names

`profile_mode_configured` records a successful owner save with `mode`,
`enabled`, and `source`. `profile_mode_generated` keeps its existing name and
records `mode` plus `source` after successful generation.

This preserves historical generated-mode queries while providing a common
configuration step for chat and the generated modes.

### Centralize the allowed payload

Typed helpers in `src/lib/analytics-events.ts` own the finite mode and source
unions and delegate to the existing `trackEvent`, which attaches
`project_id: "linkchat"` and swallows analytics failures.

Call sites pass only enum values and the saved enabled boolean. The API request
still owns success: failed responses return before analytics fires.

### Track only touched generated-mode configuration

The Appearance surface records which mode toggles or settings were edited.
After a successful save it emits one configuration event per touched mode and
clears the touched set. Saving an unrelated field does not manufacture usage
for all generated modes.

## Risks / Trade-offs

- Configuration is an owner action, not proof that visitors used the mode.
  Documentation states this explicitly and keeps public visitor measurement in
  the first-party pipeline.
- Client analytics can be blocked. The product flow remains successful because
  the shared helper is best-effort.

## Migration Plan

No data or configuration migration. Existing `profile_mode_generated` queries
continue to work and gain stable `project_id` and `source` properties.
