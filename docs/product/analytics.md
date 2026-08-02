# Analytics Event Map

This document tracks how product usage and visitor behavior are measured in LinkChat.

## Internal Product Analytics (PostHog)

We use PostHog to understand activation, retention, and feature usage for authenticated users.

Privacy mandate:
- No PII names or emails are sent to PostHog.
- No private content such as DMs, chat history, memory blocks, or scraped text is sent to PostHog.
- Users are identified by their database ID only.

| Event Name | Description | Location |
|------------|-------------|----------|
| `user_signup` | User signs up for the first time | Detected in AnalyticsProvider |
| `user_login` | User logs in | Detected in AnalyticsProvider |
| `dashboard_activated` | User lands on the main dashboard | Dashboard layout/page |
| `page_created` | User successfully creates their first profile page | PageSettings (POST) |
| `linktree_import_preview` | User previews an import from another profile | LinkEditor |
| `linktree_import_complete` | User completes an import of links | LinkEditor |
| `ai_profile_revamp_generate` | User generates an AI revamp plan | ProfileRevampAssistant |
| `ai_profile_revamp_apply` | User applies an AI revamp plan | ProfileRevampAssistant |
| `profile_enrichment_run` | User runs the auto-enrichment process | InfoEditor/Enrich API |
| `profile_mode_configured` | Owner successfully saves a touched Chat/Encyclopedia/Newspaper/Roast mode | ChatSettings/PageToggles |
| `profile_mode_generated` | Owner successfully generates an Encyclopedia/Newspaper/Roast mode | EncyclopediaEditor/PageToggles/public owner route |

Both profile-mode events use a finite `mode` and `source` taxonomy.
Configuration also records only the saved enabled boolean. These events
measure authenticated owner actions, not public readership or chat quality.
They never include page/profile identifiers, slugs, names, emails, prompts,
generated content, chat transcripts, or visitor identifiers.

## Public Visitor Analytics

Visitor interactions on public profile pages are tracked in LinkChat-owned storage to provide analytics to creators. Raw events are written to Workers Analytics Engine and the database; durable daily aggregates are written for dashboard totals.

| Event Name | Description | Location |
|------------|-------------|----------|
| `page_view` | Visitor views a public profile page | PageAnalyticsTracker |
| `outbound_click` | Visitor clicks an external link on a profile | PageAnalyticsTracker |
| `section_view` | Visitor views a public page section | TrackableSection |
| `hook_open` | Visitor opens the chat hook | Chat widget |
| `chat_cta_click` | Visitor clicks a chat CTA | Chat widget |
| `dm_start` | Visitor starts the DM flow | Chat widget |
| `dm_submit` | Visitor submits a direct message | Contact API |
| `contact_submit` | Visitor submits a contact form | Contact API |

## Visitor Identity

LinkChat uses a combination of first-party cookies and `localStorage` to track unique visitors while maintaining anonymity.

### `lc_vid` Cookie

- Name: `lc_vid`
- Type: first-party cookie.
- Value: a random opaque UUID.
- Expiry: 2 years from the last interaction.
- Attributes:
  - `SameSite=Lax`
  - `Secure` in production
  - `httpOnly=false` so client JavaScript can mirror the value to `localStorage`

### `localStorage` Fallback

The `linkchat_visitor_id` key in `localStorage` serves as a fallback and mirror for the `lc_vid` cookie. This keeps client-side event batching stable before the first tracking API response is received.

## Privacy Limits

- The visitor ID is a random UUID and contains no personally identifiable information.
- LinkChat does not use browser fingerprinting techniques.
- Visitor IDs are not linked to user accounts unless a visitor explicitly logs in or provides contact information.
- Incognito browsing, manual data clearing, multiple devices, and some privacy settings can still create new visitor IDs.

## Durable daily aggregates

Raw events are kept for debugging but dashboard totals read from daily
aggregate tables so historical numbers stay stable without keeping infinite
raw rows.

| Table | Holds |
| --- | --- |
| `dailyStats` | Daily counts for `page_view`, `hook_open`, `dm_conversion` |
| `dailyResourceStats` | Daily counts for resource-specific events (`outbound_click`, `section_view`, `chat_cta_click`) |
| `dailyVisitorEvents` | Per-visitor-per-day dedupe helper so aggregate increments are duplicate-tolerant |

- `/api/track` and `/api/contact` call `recordAggregate` after persisting the
  raw event, using an `ON CONFLICT DO UPDATE` upsert.
- Unique visitor counts increment only if the `visitorId` hasn't already been
  seen for that `(pageId, date, eventType, resourceId)` tuple.
- Aggregates update asynchronously (non-blocking) in the tracking path; expect
  sub-second lag before they show in the dashboard.
- Visitor counts are unique per day; a returning visitor on a new day counts as
  new for that day. Clearing storage / a different browser yields a new ID.

### Backfill

```bash
pnpm backfill:aggregates                     # local D1
pnpm backfill:aggregates -- --remote         # production D1, explicit
```

### D1 persistence

Aggregates live in the same **Cloudflare D1** database as the primary app data.
The backfill command uses the tracked D1 schema and defaults to local state;
remote execution must be requested explicitly.

> Historical migration plan retained at `docs/archive/analytics-migration.md`.
