import { getProfileVariant } from './profile-variants';

type AnalyticsTrafficLabel = 'unmarked' | 'internal' | 'qa';

export type AnalyticsLabels = {
  profileVariant: string;
  trafficLabel: AnalyticsTrafficLabel;
};

function normalizeTrafficLabel(value: unknown): AnalyticsTrafficLabel {
  return value === 'internal' || value === 'qa' ? value : 'unmarked';
}

export function normalizeAnalyticsLabels(value: unknown): AnalyticsLabels {
  const labels =
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    profileVariant: getProfileVariant(
      typeof labels.profileVariant === 'string' ? labels.profileVariant : null,
    ).id,
    trafficLabel: normalizeTrafficLabel(labels.trafficLabel),
  };
}

export function getAnalyticsLabels(search?: string): AnalyticsLabels {
  const currentSearch =
    search ?? (typeof window === 'undefined' ? '' : window.location.search);
  const params = new URLSearchParams(currentSearch);

  return normalizeAnalyticsLabels({
    profileVariant: params.get('variant'),
    trafficLabel: params.get('karte_traffic'),
  });
}
