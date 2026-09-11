import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ImportPasteCard } from '../src/components/create/import-paste-card';
import { OnboardingChat } from '../src/components/create/onboarding-chat';

const hooks = vi.hoisted(() => ({ values: [], cursor: 0, push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: hooks.push }),
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('react', async (original) => ({
  ...(await original()),
  useEffect() {},
  useRef: () => ({ current: null }),
  useState(initial) {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [
      hooks.values[index],
      (value) => {
        hooks.values[index] = value;
      },
    ];
  },
}));

function render(Component) {
  hooks.cursor = 0;
  return Component();
}
function buttons(node) {
  if (!node || typeof node !== 'object') return [];
  return [
    ...(node.type === 'button' ? [node] : []),
    ...React.Children.toArray(node.props?.children).flatMap(buttons),
  ];
}
function claim(Component) {
  const button = buttons(render(Component)).find((node) =>
    renderToStaticMarkup(node).includes('Claim'),
  );
  expect(button).toBeDefined();
  button.props.onClick();
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.values = [];
  hooks.cursor = 0;
  vi.stubGlobal('React', React);
});
afterEach(() => vi.unstubAllGlobals());

it.each([
  {
    Component: OnboardingChat,
    values: [
      [],
      { displayName: 'Draft Owner', slug: 'draft-owner' },
      '',
      false,
      true,
      '',
    ],
    key: 'karte_pending_onboarding',
    destination: '/login?next=/dashboard/appearance&onboarded=1',
    expected: { state: { displayName: 'Draft Owner', slug: 'draft-owner' } },
    message: 'Your draft could not be saved',
  },
  {
    Component: ImportPasteCard,
    values: [
      'https://example.test',
      false,
      '',
      [{ title: 'My work', url: 'https://example.test/work' }],
      'https://example.test',
    ],
    key: 'karte_pending_import',
    destination: '/login?next=/welcome',
    expected: {
      sourceUrl: 'https://example.test',
      links: [{ title: 'My work', url: 'https://example.test/work' }],
    },
    message: 'Your imported links could not be saved',
  },
])(
  'preserves $key on storage failure and hands off the same draft on retry',
  ({ Component, values, key, destination, expected, message }) => {
    hooks.values = values;
    const saved = new Map();
    const setItem = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      })
      .mockImplementation((name, value) => saved.set(name, value));
    vi.stubGlobal('window', { localStorage: { setItem } });

    claim(Component);
    expect(hooks.push).not.toHaveBeenCalled();
    expect(saved.size).toBe(0);
    expect(renderToStaticMarkup(render(Component))).toContain(message);

    claim(Component);
    expect(JSON.parse(saved.get(key))).toMatchObject(expected);
    expect(hooks.push).toHaveBeenCalledExactlyOnceWith(destination);
    expect(setItem).toHaveBeenCalledTimes(2);
  },
);
