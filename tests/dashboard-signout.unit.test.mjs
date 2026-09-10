import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Sidebar } from '../src/components/dashboard/sidebar';

const mocks = vi.hoisted(() => ({
  values: [],
  cursor: 0,
  signOut: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('@/lib/auth-client', () => ({
  authClient: { signOut: mocks.signOut },
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }) =>
    React.createElement('a', props, children),
}));
vi.mock('react', async (original) => ({
  ...(await original()),
  useEffect() {},
  useState(initial) {
    const index = mocks.cursor++;
    if (!(index in mocks.values)) mocks.values[index] = initial;
    return [
      mocks.values[index],
      (value) => {
        mocks.values[index] = value;
      },
    ];
  },
}));
function render() {
  mocks.cursor = 0;
  return Sidebar({ slug: 'owner' });
}
function buttons(node) {
  if (!node || typeof node !== 'object') return [];
  return [
    ...(node.type === 'button' ? [node] : []),
    ...React.Children.toArray(node.props?.children).flatMap(buttons),
  ];
}
function signOutButton() {
  return buttons(render()).find(
    (button) => button.props.children === 'Sign out',
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.values = [];
  mocks.cursor = 0;
  vi.stubGlobal('React', React);
  vi.stubGlobal('window', { location: { replace: mocks.replace } });
});
afterEach(() => vi.unstubAllGlobals());

it('ends the session before a full navigation to login', async () => {
  mocks.signOut.mockResolvedValue({ error: null });
  signOutButton().props.onClick();
  expect(
    buttons(render()).find((button) => button.props.children === 'Signing out…')
      .props.disabled,
  ).toBe(true);
  await vi.waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
  expect(mocks.signOut).toHaveBeenCalledOnce();
});
it.each(['server', 'network'])(
  'keeps failed %s sign-out visible and retryable',
  async (failure) => {
    if (failure === 'server')
      mocks.signOut.mockResolvedValue({ error: { message: 'Unavailable' } });
    else mocks.signOut.mockRejectedValue(new Error('Network unavailable'));
    signOutButton().props.onClick();
    await vi.waitFor(() =>
      expect(renderToStaticMarkup(render())).toContain('Could not sign out'),
    );
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(signOutButton().props.disabled).toBe(false);
  },
);
