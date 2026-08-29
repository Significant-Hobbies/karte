/**
 * Regression guard for the edge shadowing real API routes.
 *
 * `agent-edge.mjs` carried a `path.startsWith('/api/')` catch-all that answered
 * 404 *before* OpenNext ever saw the request, with only `/api/ai` allow-listed
 * above it. Every other `GET /api/*` — `/api/pages`, `/api/v1/agents`, the
 * whole better-auth surface — was 404'd at the edge in production, while POST
 * to the same paths reached its handler.
 *
 * These tests drive the real `worker.mjs` entrypoint with a stubbed OpenNext
 * handler (see `fixtures/open-next-worker-stub.mjs`), so they cover the actual
 * wiring, not a reimplementation of it.
 *
 * The route list is read off the filesystem rather than hard-coded: a route
 * handler added under `src/app/api/` is covered the moment it lands, which is
 * exactly the rot the original hand-maintained allow-list suffered.
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

import worker from '../worker.mjs';
import { openNextStub } from './fixtures/open-next-worker-stub.mjs';

const API_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/app/api',
);

/** Turn `src/app/api/pages/[pageId]/links/route.ts` into `/api/pages/sample/links`. */
function collectApiRoutePaths(dir, prefix = '/api') {
  const paths = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const dynamic = entry.name.startsWith('[');
      const catchAll =
        entry.name.startsWith('[...') || entry.name.startsWith('[[...');
      const segment = dynamic
        ? catchAll
          ? 'sample/segment'
          : 'sample'
        : entry.name;
      paths.push(
        ...collectApiRoutePaths(join(dir, entry.name), `${prefix}/${segment}`),
      );
    } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
      paths.push(prefix);
    }
  }
  return paths;
}

const API_ROUTE_PATHS = collectApiRoutePaths(API_DIR);

const ctx = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
};
const env = { NEXT_PUBLIC_APP_URL: 'https://karte.cc' };

function request(path, { method = 'GET', headers = {} } = {}) {
  return worker.fetch(
    new Request(`https://karte.cc${path}`, {
      method,
      headers: { host: 'karte.cc', ...headers },
    }),
    env,
    ctx,
  );
}

beforeEach(() => {
  openNextStub.reset();
});

describe('edge does not shadow Next.js API routes', () => {
  it('found the route handlers to guard', () => {
    // Sanity check: if this ever hits zero the suite below is vacuous.
    expect(API_ROUTE_PATHS.length).toBeGreaterThan(20);
    expect(API_ROUTE_PATHS).toContain('/api/pages');
    expect(API_ROUTE_PATHS).toContain('/api/auth/sample/segment');
  });

  it('reaches a real API route through the edge on GET', async () => {
    openNextStub.handler = () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    const response = await request('/api/pages');

    expect(openNextStub.calls).toEqual(['/api/pages']);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it.each(API_ROUTE_PATHS)('lets GET %s reach Next.js', async (path) => {
    openNextStub.handler = () => new Response('routed', { status: 200 });

    const response = await request(path);

    expect(openNextStub.calls).toEqual([path]);
    expect(response.status).toBe(200);
  });

  it('lets HEAD reach Next.js too', async () => {
    openNextStub.handler = () => new Response(null, { status: 200 });

    const response = await request('/api/pages', { method: 'HEAD' });

    expect(openNextStub.calls).toEqual(['/api/pages']);
    expect(response.status).toBe(200);
  });

  it('does not let an Accept header divert an API route to the markdown 404', async () => {
    openNextStub.handler = () => new Response('routed', { status: 200 });

    const response = await request('/api/pages', {
      headers: { accept: 'text/markdown' },
    });

    expect(openNextStub.calls).toEqual(['/api/pages']);
    expect(response.status).toBe(200);
  });
});

describe('unknown API paths still answer with the JSON 404 envelope', () => {
  it('replaces the Next.js HTML 404 with JSON', async () => {
    openNextStub.handler = () =>
      new Response('<!DOCTYPE html><html><body>404</body></html>', {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });

    const response = await request('/api/definitely-not-a-real-path');

    expect(openNextStub.calls).toEqual(['/api/definitely-not-a-real-path']);
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await response.json()).toEqual({
      error: {
        code: 'not_found',
        message: 'Unknown API path: /api/definitely-not-a-real-path',
        path: '/api/definitely-not-a-real-path',
      },
    });
  });

  it("leaves a route handler's own JSON 404 body untouched", async () => {
    openNextStub.handler = () =>
      new Response(JSON.stringify({ error: 'page not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });

    const response = await request('/api/pages/999999/links');

    expect(await response.json()).toEqual({ error: 'page not found' });
  });

  it('leaves non-API 404s alone so the HTML error page still renders', async () => {
    openNextStub.handler = () =>
      new Response('<!DOCTYPE html><html><body>404</body></html>', {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });

    const response = await request('/no-such-page');

    expect(openNextStub.calls).toEqual(['/no-such-page']);
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('text/html');
  });
});

describe('edge-owned surfaces still work', () => {
  it('serves the agent catalog at /api/ai without touching Next.js', async () => {
    const response = await request('/api/ai');

    expect(openNextStub.calls).toEqual([]);
    expect(response.status).toBe(200);
    const catalog = await response.json();
    expect(catalog.name).toBe('Karte');
    expect(catalog.url).toBe('https://karte.cc');
  });

  it('serves llms.txt, llms-full.txt, index.md, robots.txt and openapi.json', async () => {
    for (const path of [
      '/llms.txt',
      '/llms-full.txt',
      '/index.md',
      '/robots.txt',
      '/openapi.json',
    ]) {
      expect((await request(path)).status, path).toBe(200);
    }
    expect(openNextStub.calls).toEqual([]);
  });

  it('still negotiates markdown on the homepage', async () => {
    const response = await request('/', {
      headers: { accept: 'text/markdown' },
    });

    expect(openNextStub.calls).toEqual([]);
    expect(response.headers.get('content-type')).toContain('text/markdown');
  });

  it('still serves the markdown 404 for unknown non-API pages', async () => {
    const response = await request('/no-such-page', {
      headers: { accept: 'text/markdown' },
    });

    expect(openNextStub.calls).toEqual([]);
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toContain('text/markdown');
  });
});
