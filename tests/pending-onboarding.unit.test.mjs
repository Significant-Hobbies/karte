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
  stored: '',
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
  state.stored = JSON.stringify({
    state: { slug: 'first-profile', displayName: 'New Owner' },
  });
  state.values = [];
  state.effects = [];
  state.cursor = 0;
  vi.stubGlobal('React', React);
  vi.stubGlobal('window', {
    localStorage: {
      getItem: () => state.stored,
      setItem: (_key, value) => {
        state.stored = value;
      },
      removeItem: state.removeItem,
    },
  });
  render();
  state.effects[0]();
});

function reload() {
  state.values = [];
  state.effects = [];
  render();
  state.effects[0]();
}

it('retains failed items across reload and retries without recreating the page or successful items', async () => {
  const good = { title: 'Good', url: 'https://example.test/good' };
  const retry = { title: 'Retry', url: 'https://example.test/retry' };
  const project = {
    title: 'Project',
    url: 'https://example.test/project',
    description: 'A project',
  };
  state.stored = JSON.stringify({
    state: { slug: 'first-profile', links: [good, retry], projects: [project] },
  });
  reload();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id: 'new-page' }, { status: 201 }))
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(Response.json({ id: 'good' }, { status: 201 }))
    .mockResolvedValueOnce(
      Response.json({ error: 'Unavailable' }, { status: 503 }),
    )
    .mockResolvedValueOnce(Response.json([]))
    .mockResolvedValueOnce(Response.json({ id: 'project' }, { status: 201 }));
  vi.stubGlobal('fetch', fetch);
  await buttons(render())
    .find((b) => b.props.children === 'Create my page')
    .props.onClick();
  expect(renderToStaticMarkup(render())).toContain(
    '1 item could not be imported',
  );
  expect(JSON.parse(state.stored).state).toMatchObject({
    pageId: 'new-page',
    links: [retry],
    projects: [],
  });
  expect(state.removeItem).not.toHaveBeenCalled();
  reload();
  fetch.mockClear();
  fetch
    .mockResolvedValueOnce(Response.json([good]))
    .mockResolvedValueOnce(Response.json({ id: 'retry' }, { status: 201 }));
  await buttons(render())
    .find((b) => b.props.children === 'Retry remaining items')
    .props.onClick();
  expect(
    fetch.mock.calls.map(([url, options]) => [url, options?.method ?? 'GET']),
  ).toEqual([
    ['/api/pages/new-page/links', 'GET'],
    ['/api/pages/new-page/links', 'POST'],
  ]);
  expect(state.removeItem).toHaveBeenCalledOnce();
});

it('reconciles a saved item after a lost response instead of posting it twice', async () => {
  const link = { title: 'Saved', url: 'https://example.test/saved' };
  state.stored = JSON.stringify({
    state: { pageId: 'new-page', slug: 'first-profile', links: [link] },
  });
  reload();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json([]))
    .mockRejectedValueOnce(new Error('Connection lost'));
  vi.stubGlobal('fetch', fetch);
  await buttons(render())
    .find((b) => b.props.children === 'Retry remaining items')
    .props.onClick();
  expect(state.removeItem).not.toHaveBeenCalled();
  reload();
  fetch.mockClear();
  fetch.mockResolvedValueOnce(
    Response.json([{ ...link, id: 'saved', body: null }]),
  );
  await buttons(render())
    .find((b) => b.props.children === 'Retry remaining items')
    .props.onClick();
  expect(fetch).toHaveBeenCalledOnce();
  expect(state.removeItem).toHaveBeenCalledOnce();
});

it('stops before writes when durable draft storage is unavailable', async () => {
  window.localStorage.setItem = () => {
    throw new Error('Storage full');
  };
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await buttons(render())
    .find((b) => b.props.children === 'Create my page')
    .props.onClick();
  expect(fetch).not.toHaveBeenCalled();
  expect(renderToStaticMarkup(render())).toContain('Storage full');
  expect(state.removeItem).not.toHaveBeenCalled();
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
