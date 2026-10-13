import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  pathname: '/create',
  slug: null,
  effects: [],
  track: vi.fn(),
}));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('react', () => ({
  useEffect: (effect) => state.effects.push(effect),
  useRef: () => ({ current: null }),
}));
vi.mock('@/lib/analytics', () => ({ trackEvent: state.track }));

import { PageAnalyticsTracker } from '../src/components/public/page-analytics-tracker';

beforeEach(() => {
  state.effects = [];
  state.slug = null;
  vi.clearAllMocks();
  vi.stubGlobal('window', {
    location: {
      search: '',
      href: 'http://localhost:3000/create',
      origin: 'http://localhost:3000',
    },
  });
  vi.stubGlobal('document', {
    querySelector: () =>
      state.slug ? { dataset: { kartePublicSlug: state.slug } } : null,
    referrer: '',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
it.each([
  '/create',
  '/about',
  '/login',
  '/welcome',
  '/faq',
  '/dashboard/appearance',
])('does not send profile analytics for %s', (path) => {
  state.pathname = path;
  PageAnalyticsTracker();
  state.effects.forEach((effect) => {
    effect();
  });
  expect(state.track).not.toHaveBeenCalled();
  expect(document.addEventListener).not.toHaveBeenCalled();
});
it.each(['/fixture-profile', '/', '/fixture-profile/roast'])(
  'tracks the layout profile marker at %s',
  (path) => {
    state.pathname = path;
    state.slug = 'fixture-profile';
    PageAnalyticsTracker();
    state.effects.forEach((effect) => {
      effect();
    });
    expect(state.track).toHaveBeenCalledWith(
      'fixture-profile',
      expect.objectContaining({ eventType: 'page_view' }),
    );
    expect(document.addEventListener).toHaveBeenCalledWith(
      'click',
      expect.any(Function),
      true,
    );
  },
);
