import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { verifyTurnstile } = await import('../src/lib/turnstile.ts');

describe('Turnstile siteverify boundary', () => {
  beforeEach(() => {
    vi.stubEnv('TURNSTILE_SECRET', 'test-secret');
    vi.stubEnv('TURNSTILE_HOSTNAMES', 'karte.cc');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('accepts a successful contact token for Karte and its subdomains', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: 'contact',
          hostname: 'profile.karte.cc',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    assert.equal(
      await verifyTurnstile({
        token: 'single-use-token',
        action: 'contact',
        remoteIp: '203.0.113.8',
      }),
      true,
    );

    const [url, init] = fetchMock.mock.calls[0];
    assert.equal(
      url,
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    assert.equal(init.method, 'POST');
    assert.equal(init.body.get('secret'), 'test-secret');
    assert.equal(init.body.get('response'), 'single-use-token');
    assert.equal(init.body.get('remoteip'), '203.0.113.8');
  });

  it('rejects an action or hostname mismatch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          action: 'login',
          hostname: 'attacker.example',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    assert.equal(
      await verifyTurnstile({
        token: 'single-use-token',
        action: 'contact',
      }),
      false,
    );
  });

  it('fails closed without a token or when siteverify errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    assert.equal(
      await verifyTurnstile({ token: '', action: 'contact' }),
      false,
    );
    assert.equal(fetchMock.mock.calls.length, 0);

    assert.equal(
      await verifyTurnstile({
        token: 'single-use-token',
        action: 'contact',
      }),
      false,
    );
  });
});
