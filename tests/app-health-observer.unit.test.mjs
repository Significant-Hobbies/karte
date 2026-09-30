import { afterEach, describe, expect, it, vi } from 'vitest';

import { observeRequest } from '../app-health.mjs';

afterEach(() => vi.unstubAllGlobals());

describe('App Health endpoint observer', () => {
  it('aggregates API routes without sending dynamic path or query values', async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', send);
    const pending = [];
    const ctx = { waitUntil: (promise) => pending.push(promise) };

    observeRequest(
      new Request(
        'https://karte.cc/api/pages/private-page-id?token=private-query',
      ),
      new Response(null, { status: 503 }),
      12.7,
      { APP_HEALTH_INGEST_KEY: 'test-key' },
      ctx,
    );
    await Promise.all(pending);

    expect(send).toHaveBeenCalledTimes(1);
    const [url, options] = send.mock.calls[0];
    const batch = JSON.parse(options.body);
    expect(url).toBe('https://ingest.sassmaker.com/v1/ingest');
    expect(batch.events[0]).toMatchObject({
      method: 'GET',
      route: '/api/pages',
      status_code: 503,
      duration_ms: 13,
    });
    expect(Number.isInteger(batch.events[0].timestamp)).toBe(true);
    expect(options.headers.authorization).toBe('Bearer test-key');
    expect(options.body).not.toContain('private-page-id');
    expect(options.body).not.toContain('private-query');
  });

  it('falls back to the API root for unknown groups and no-ops without a key', () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', send);
    const waitUntil = vi.fn();
    const ctx = { waitUntil };

    observeRequest(
      new Request('https://karte.cc/api/private-segment/secret'),
      new Response(null, { status: 200 }),
      1,
      { APP_HEALTH_INGEST_KEY: 'test-key' },
      ctx,
    );
    observeRequest(
      new Request('https://karte.cc/api/pages'),
      new Response(null, { status: 200 }),
      1,
      {},
      ctx,
    );

    expect(JSON.parse(send.mock.calls[0][1].body).events[0].route).toBe('/api');
    expect(send).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it('keeps nested paths under static roots out of telemetry', async () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', send);
    const pending = [];
    const ctx = { waitUntil: (promise) => pending.push(promise) };

    observeRequest(
      new Request('https://karte.cc/contact/private-email-address'),
      new Response(null, { status: 200 }),
      3,
      { APP_HEALTH_INGEST_KEY: 'test-key' },
      ctx,
    );
    await Promise.all(pending);

    const body = send.mock.calls[0][1].body;
    expect(JSON.parse(body).events[0].route).toBe('/contact');
    expect(body).not.toContain('private-email-address');
  });
});
