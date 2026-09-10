import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatList } from '../src/components/dashboard/chat-list';

const hooks = vi.hoisted(() => ({ values: [], cursor: 0, effects: [] }));
vi.mock('react', async (original) => ({
  ...(await original()),
  useState(initial) {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [
      hooks.values[index],
      (value) => {
        hooks.values[index] =
          typeof value === 'function' ? value(hooks.values[index]) : value;
      },
    ];
  },
  useEffect(effect) {
    hooks.effects.push(effect);
  },
}));

function render() {
  hooks.cursor = 0;
  return ChatList({ pageId: 'owned-page' });
}

function buttons(node) {
  if (!node || typeof node !== 'object') return [];
  return [
    ...(node.type === 'button' ? [node] : []),
    ...React.Children.toArray(node.props?.children).flatMap(buttons),
  ];
}

beforeEach(() => {
  hooks.values = [];
  hooks.effects = [];
  hooks.cursor = 0;
  vi.stubGlobal('React', React);
});
afterEach(() => vi.unstubAllGlobals());

async function loadList(response) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
  render();
  hooks.effects[0]();
  await vi.waitFor(() => expect(hooks.values[1]).toBe(false));
  return render();
}

describe('owner chat request failures', () => {
  it.each([401, 500])(
    'shows retry instead of empty history for HTTP %s',
    async (status) => {
      const tree = await loadList(new Response('{}', { status }));
      const html = renderToStaticMarkup(tree);
      expect(html).toContain('Could not load conversations');
      expect(html).not.toContain('No conversations yet');
      buttons(tree)[0].props.onClick();
      expect(hooks.values[3]).toBe(1);
    },
  );

  it('rejects a non-array success payload without crashing', async () => {
    const tree = await loadList(
      Response.json({ error: 'Unexpected response' }),
    );
    expect(renderToStaticMarkup(tree)).toContain('Retry conversations');
  });

  it('retries a failed message read and renders the recovered messages', async () => {
    const tree = await loadList(
      Response.json([
        {
          id: 'conversation',
          createdAt: '2026-09-10',
          messageCount: 1,
          firstMessage: 'Hello',
        },
      ]),
    );
    fetch.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    await buttons(tree)[0].props.onClick();
    const failed = render();
    expect(renderToStaticMarkup(failed)).toContain('Could not load messages');
    expect(renderToStaticMarkup(failed)).not.toContain(
      'No messages in this conversation',
    );
    fetch.mockResolvedValueOnce(
      Response.json([
        { id: 'message', role: 'assistant', content: 'Recovered answer' },
      ]),
    );
    buttons(failed)
      .find((button) => button.props.children === 'Retry messages')
      .props.onClick();
    await vi.waitFor(() =>
      expect(renderToStaticMarkup(render())).toContain('Recovered answer'),
    );
  });
});
