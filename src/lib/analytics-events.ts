/**
 * Owner-facing analytics — the fixed 5-event taxonomy.
 *
 * Every project in the fleet emits exactly these five events — `signup`,
 * `activated`, `core_action`, `returned`, `page_view` — so a single PostHog
 * project can build one cross-fleet funnel (signup -> activated ->
 * core_action) and a D1/D7 retention insight, with no custom dashboard.
 *
 * Every event carries `project_id: "linkchat"`.
 *
 * NOTE: this is the OWNER-facing taxonomy. It is deliberately separate from
 * `src/lib/analytics.ts`, which is the visitor-facing event pipeline for
 * public profile pages (page views, outbound clicks, etc.). Do not merge
 * the two — they answer different questions for different audiences.
 *
 * linkchat runs on Cloudflare Workers with no `posthog-node`, so this module
 * is browser-only and routes through `posthog-js` (initialized by the
 * AnalyticsProvider in `posthog-provider.tsx`).
 */
import posthog from 'posthog-js';

const PROJECT = 'linkchat' as const;

/**
 * The product-specific action behind a `core_action` event.
 * linkchat's core verbs: publishing a profile, and generating one of the
 * shareable AI profile modes (encyclopedia / newspaper / roast).
 */
export type CoreAction = 'page_published' | 'mode_generated';
export type ProfileMode = 'chat' | 'encyclopedia' | 'newspaper' | 'roast';
export type GeneratedProfileMode = Exclude<ProfileMode, 'chat'>;
export type ProfileModeConfigurationSource =
  | 'chat_settings'
  | 'appearance_settings';
export type ProfileModeGenerationSource =
  | 'dashboard_toggles'
  | 'encyclopedia_editor'
  | 'public_mode_route';

interface AnalyticsEventMap {
  /** First session after an account is created. */
  signup: { project_id: typeof PROJECT };
  /** The user reaches first real value — their first published profile. */
  activated: { project_id: typeof PROJECT };
  /** The thing the product exists to do. */
  core_action: { project_id: typeof PROJECT; action: CoreAction };
  /** A return session by a user with prior activity. */
  returned: { project_id: typeof PROJECT };
  /** A page view, tracked on mount and on route changes. */
  page_view: { project_id: typeof PROJECT };
}

export function trackEvent(
  event: string,
  properties: Record<string, unknown> = {},
): void {
  try {
    if (typeof window === 'undefined') return;
    posthog.capture(event, { project_id: PROJECT, ...properties });
  } catch {
    // Analytics must never break a user flow. Swallow and move on.
  }
}

function emit<K extends keyof AnalyticsEventMap>(
  event: K,
  props: Omit<AnalyticsEventMap[K], 'project_id'>,
): void {
  trackEvent(event, props);
}

/** Fire once, on the first session after an account is created. */
export function trackSignup(): void {
  emit('signup', {});
}

/** Fire once, when the user first reaches real value (first publish). */
export function trackActivated(): void {
  emit('activated', {});
}

/** Fire on each completion of the core product action. */
export function trackCoreAction(action: CoreAction): void {
  emit('core_action', { action });
}

/** Fire on session start for a user who has prior activity. */
export function trackReturned(): void {
  emit('returned', {});
}

/** Fire on mount and on every route change. */
export function trackPageView(): void {
  emit('page_view', {});
}

export function trackProfileModeConfigured(properties: {
  mode: ProfileMode;
  enabled: boolean;
  source: ProfileModeConfigurationSource;
}): void {
  trackEvent('profile_mode_configured', properties);
}

export function trackProfileModeGenerated(properties: {
  mode: GeneratedProfileMode;
  source: ProfileModeGenerationSource;
}): void {
  trackEvent('profile_mode_generated', properties);
}
