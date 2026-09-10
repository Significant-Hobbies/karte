import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PendingOnboardingBanner } from '../src/components/dashboard/pending-onboarding-banner';

const state = vi.hoisted(() => ({
  values: [],
  cursor: 0,
  effects: [],
  refresh: vi.fn(),
  removeItem: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: state.refresh }),
  useSearchParams: () => new URLSearchParams('onboarded=1'),
}));
vi.mock('posthog-js', () => ({ default: { capture: vi.fn() } }));
vi.mock('react', async (original) => ({
  ...(await original()),
  useEffect(effect) {
    state.effects.push(effect);
  },
  useState(initial) {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [
      state.values[index],
      (value) => {
        state.values[index] = value;
      },
    ];
  },
}));
function render() {
  state.cursor = 0;
  return PendingOnboardingBanner();
}
function buttons(node) {
  if (!node || typeof node !== 'object') return [];
  return [
    ...(node.type === 'button' ? [node] : []),
    ...React.Children.toArray(node.props?.children).flatMap(buttons),
  ];
}
beforeEach(() => {
  vi.clearAllMocks();
  state.values = [];
  state.effects = [];
  state.cursor = 0;
  vi.stubGlobal('React', React);
  vi.stubGlobal('window', {
    localStorage: {
      getItem: () =>
        JSON.stringify({
          state: { slug: 'first-profile', displayName: 'New Owner' },
        }),
      removeItem: state.removeItem,
    },
  });
  render();
  state.effects[0]();
});
afterEach(() => vi.unstubAllGlobals());
it('refreshes the editor after creating a draft without claiming it is public', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ id: 'new-page', published: false }, { status: 201 }),
      ),
  );
  await buttons(render())
    .find((button) => button.props.children === 'Create my page')
    .props.onClick();
  const markup = renderToStaticMarkup(render());
  expect(markup).toContain('Draft created');
  expect(markup).toContain('turn on Published');
  expect(markup).not.toContain('Page live');
  expect(state.refresh).toHaveBeenCalledOnce();
  expect(state.removeItem).toHaveBeenCalledWith('karte_pending_onboarding');
});
it('retains the draft and allows retry when creation fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: 'Slug is already taken' }, { status: 409 }),
      ),
  );
  await buttons(render())
    .find((button) => button.props.children === 'Create my page')
    .props.onClick();
  expect(renderToStaticMarkup(render())).toContain('Slug is already taken');
  expect(state.refresh).not.toHaveBeenCalled();
  expect(state.removeItem).not.toHaveBeenCalled();
  expect(
    buttons(render()).find(
      (button) => button.props.children === 'Create my page',
    ).props.disabled,
  ).toBe(false);
});
