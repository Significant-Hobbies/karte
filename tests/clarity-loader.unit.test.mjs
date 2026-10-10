import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

function load(relativePath) {
  const page = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  expect(page).toContain('set:html={clarityLoaderScript}');
  const source = readFileSync(new URL('../landing-astro/src/lib/clarity-loader.ts', import.meta.url), 'utf8');
  const script = source.slice(source.indexOf('`') + 1, source.lastIndexOf('`'));
  const target = new EventTarget();
  const inserted = [];
  const anchor = {
    parentNode: { insertBefore: (element) => inserted.push(element) },
  };
  const window = {};
  let timeout;
  const addEventListener = vi.fn(target.addEventListener.bind(target));
  const removeEventListener = vi.fn(target.removeEventListener.bind(target));
  const clearTimeout = vi.fn();
  const setTimeout = vi.fn((callback) => {
    timeout = callback;
    return 1;
  });

  runInNewContext(script, {
    window,
    document: {
      createElement: () => ({}),
      getElementsByTagName: () => [anchor],
    },
    addEventListener,
    removeEventListener,
    setTimeout,
    clearTimeout,
  });

  return {
    window,
    inserted,
    addEventListener,
    removeEventListener,
    setTimeout,
    clearTimeout,
    interact: (event) => target.dispatchEvent(new Event(event)),
    expire: () => timeout(),
  };
}

describe.each([
  '../landing-astro/src/pages/index.astro',
  '../landing-astro/src/layouts/Layout.astro',
])('deferred Clarity loader in %s', (path) => {
  it('defines the stub and queues attribution before fetching any script', () => {
    const loader = load(path);

    expect(typeof loader.window.clarity).toBe('function');
    expect(Array.from(loader.window.clarity.q[0])).toEqual([
      'set',
      'project_id',
      'karte',
    ]);
    loader.window.clarity('set', 'example', 'queued');
    expect(loader.window.clarity.q).toHaveLength(2);
    expect(loader.inserted).toHaveLength(0);
    expect(loader.setTimeout).toHaveBeenCalledWith(expect.any(Function), 90000);
    for (const event of events) {
      expect(loader.addEventListener).toHaveBeenCalledWith(
        event,
        expect.any(Function),
        { passive: true, once: true },
      );
    }
  });

  it.each(events)('loads once on %s and removes all listeners', (event) => {
    const loader = load(path);
    loader.interact(event);

    expect(loader.inserted).toEqual([
      { async: 1, src: 'https://www.clarity.ms/tag/y6bv15rm1t' },
    ]);
    expect(loader.clearTimeout).toHaveBeenCalledWith(1);
    for (const name of events) {
      expect(loader.removeEventListener).toHaveBeenCalledWith(
        name,
        expect.any(Function),
      );
      loader.interact(name);
    }
    loader.expire();
    expect(loader.inserted).toHaveLength(1);
  });

  it('loads after 30 seconds without interaction and ignores later triggers', () => {
    const loader = load(path);
    loader.expire();
    for (const event of events) loader.interact(event);
    loader.expire();

    expect(loader.inserted).toEqual([
      { async: 1, src: 'https://www.clarity.ms/tag/y6bv15rm1t' },
    ]);
    expect(loader.removeEventListener).toHaveBeenCalledTimes(events.length);
  });
});
