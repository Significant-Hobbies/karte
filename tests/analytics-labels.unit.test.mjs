import { describe, expect, it } from 'vitest';

import {
  getAnalyticsLabels,
  normalizeAnalyticsLabels,
} from '../src/lib/analytics-labels';

describe('privacy-safe analytics labels', () => {
  it('marks only explicit internal and QA traffic and keeps other traffic unmarked', () => {
    expect(getAnalyticsLabels('?karte_traffic=internal')).toEqual({
      profileVariant: 'baseline',
      trafficLabel: 'internal',
    });
    expect(getAnalyticsLabels('?karte_traffic=qa')).toEqual({
      profileVariant: 'baseline',
      trafficLabel: 'qa',
    });
    expect(getAnalyticsLabels('?karte_traffic=customer')).toEqual({
      profileVariant: 'baseline',
      trafficLabel: 'unmarked',
    });
  });

  it('normalizes variant and traffic labels without preserving arbitrary values', () => {
    expect(
      normalizeAnalyticsLabels({
        profileVariant: 'unknown-value',
        trafficLabel: 'owner@example.test',
      }),
    ).toEqual({ profileVariant: 'baseline', trafficLabel: 'unmarked' });
    expect(getAnalyticsLabels('?variant=proof&karte_traffic=internal')).toEqual(
      { profileVariant: 'proof', trafficLabel: 'internal' },
    );
  });
});
