import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({ db: null }));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => ({ env: { DB: runtime.db } }),
}));
vi.mock('../src/lib/ping', () => ({ ping: vi.fn() }));

const origin = 'https://karte.example';
const secret =
  'synthetic-karte-auth-compatibility-secret-at-least-32-characters';
let sqlite;
let auth;
let routes;

function prepare(sql, values = []) {
  return {
    bind: (...bound) => prepare(sql, bound),
    first: async () => sqlite.prepare(sql).get(...values) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
    raw: async () => {
      const statement = sqlite.prepare(sql);
      statement.setReturnArrays(true);
      return statement.all(...values);
    },
    run: async () => ({
      meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) },
    }),
  };
}

function signedCookie(name, value) {
  // Existing 1.6 signed-cookie wire format; not a mocked session lookup.
  const signature = createHmac('sha256', secret).update(value).digest('base64');
  return `${name}=${encodeURIComponent(`${value}.${signature}`)}`;
}

function count(table) {
  return Number(
    sqlite.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count,
  );
}

function request(
  path,
  { method = 'GET', body, cookie, requestOrigin = origin } = {},
) {
  const headers = new Headers({ origin: requestOrigin });
  if (cookie) headers.set('cookie', cookie);
  if (body) headers.set('content-type', 'application/json');
  const req = new Request(`${origin}/api/auth/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return routes[method](req);
}

function cookieHeader(response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
}

async function startGoogle(callbackURL = `${origin}/dashboard`) {
  const response = await request('sign-in/social', {
    method: 'POST',
    body: { provider: 'google', callbackURL, disableRedirect: true },
  });
  expect(response.status).toBe(200);
  const location = new URL((await response.json()).url);
  expect(location.origin).toBe('https://accounts.google.com');
  expect(location.searchParams.get('redirect_uri')).toBe(
    `${origin}/api/auth/callback/google`,
  );
  expect(location.searchParams.get('client_id')).toBe(
    'synthetic-google-client',
  );
  expect(location.searchParams.get('code_challenge_method')).toBe('S256');
  return { location, cookie: cookieHeader(response) };
}

async function providerFixture() {
  const context = await auth.$context;
  const google = context.socialProviders.find(
    (provider) => provider.id === 'google',
  );
  const validate = vi
    .spyOn(google, 'validateAuthorizationCode')
    .mockResolvedValue({
      accessToken: 'synthetic-provider-access-token',
      scopes: ['openid', 'email', 'profile'],
    });
  const userInfo = vi.spyOn(google, 'getUserInfo').mockResolvedValue({
    data: {
      sub: 'existing-google-subject',
      email: 'owner@example.invalid',
      email_verified: true,
      name: 'Existing owner',
    },
    user: {
      id: 'existing-google-subject',
      name: 'Existing owner',
      email: 'owner@example.invalid',
      emailVerified: true,
    },
  });
  return { validate, userInfo };
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('TEST', '');
  vi.stubEnv('BETTER_AUTH_URL', origin);
  vi.stubEnv('BETTER_AUTH_SECRET', secret);
  vi.stubEnv('GOOGLE_CLIENT_ID', 'synthetic-google-client');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'synthetic-google-secret');
  vi.stubGlobal('fetch', () => {
    throw new Error('Compatibility tests must not contact external providers.');
  });
  sqlite = new DatabaseSync(':memory:');
  runtime.db = {
    prepare,
    batch: async (statements) =>
      Promise.all(statements.map((statement) => statement.run())),
  };
  const factory = await import('../src/lib/auth');
  await factory.ensureAuthTables();
  await factory.ensureAuthTables();
  auth = factory.createAuth();
  expect((await auth.$context).skipOriginCheck).toBe(false);
  expect((await auth.$context).skipCSRFCheck).toBe(false);
  routes = await import('../src/app/api/auth/[...all]/route');
  const now = Math.floor(Date.now() / 1000);
  sqlite
    .prepare(`INSERT INTO user
    (id,name,email,emailVerified,aiEndpointUrl,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)`)
    .run(
      'existing-owner',
      'Existing owner',
      'owner@example.invalid',
      1,
      'https://model.example.invalid/v1',
      now,
      now,
    );
  sqlite
    .prepare(`INSERT INTO session
    (id,expiresAt,token,createdAt,updatedAt,userId) VALUES (?,?,?,?,?,?)`)
    .run(
      'existing-session',
      now + 3600,
      'existing-session-token',
      now,
      now,
      'existing-owner',
    );
  sqlite
    .prepare(`INSERT INTO account
    (id,accountId,providerId,userId,createdAt,updatedAt) VALUES (?,?,?,?,?,?)`)
    .run(
      'existing-google-account',
      'existing-google-subject',
      'google',
      'existing-owner',
      now,
      now,
    );
});

afterEach(() => {
  sqlite?.close();
  runtime.db = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('installed Better Auth with Karte factory, D1 adapter and Next route', () => {
  it('accepts an existing signed session cookie and preserves custom owner/account data', async () => {
    const cookie = signedCookie(
      '__Secure-better-auth.session_token',
      'existing-session-token',
    );
    const response = await request('get-session', { cookie });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: { id: 'existing-owner', email: 'owner@example.invalid' },
      session: { userId: 'existing-owner', token: 'existing-session-token' },
    });
    expect(
      sqlite.prepare('SELECT aiEndpointUrl FROM user').get().aiEndpointUrl,
    ).toBe('https://model.example.invalid/v1');
    expect(
      sqlite.prepare('SELECT accountId,providerId,userId FROM account').get(),
    ).toMatchObject({
      accountId: 'existing-google-subject',
      providerId: 'google',
      userId: 'existing-owner',
    });
    expect(count('user')).toBe(1);
    expect(count('account')).toBe(1);
  });

  it('rejects missing, unknown, tampered and expired sessions', async () => {
    for (const cookie of [
      undefined,
      signedCookie('__Secure-better-auth.session_token', 'unknown'),
      '__Secure-better-auth.session_token=existing-session-token.invalid',
    ]) {
      expect(
        await (await request('get-session', { cookie })).json(),
      ).toBeNull();
    }
    sqlite.prepare('UPDATE session SET expiresAt=1').run();
    expect(
      await (
        await request('get-session', {
          cookie: signedCookie(
            '__Secure-better-auth.session_token',
            'existing-session-token',
          ),
        })
      ).json(),
    ).toBeNull();
    expect(count('user')).toBe(1);
    expect(count('account')).toBe(1);
  });

  it('starts and completes a Google flow against the existing account, with a usable secure cookie', async () => {
    const provider = await providerFixture();
    const { location, cookie } = await startGoogle();
    expect(count('verification')).toBe(1);
    const state = location.searchParams.get('state');
    expect(
      sqlite.prepare('SELECT identifier FROM verification').get().identifier,
    ).toBe(`auth-state:${state}`);
    const response = await request(
      `callback/google?state=${state}&code=synthetic-code`,
      { cookie },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${origin}/dashboard`);
    expect(provider.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'synthetic-code',
        redirectURI: `${origin}/api/auth/callback/google`,
      }),
    );
    const sessionCookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith('__Secure-better-auth.session_token='));
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('Secure');
    expect(sessionCookie).toContain('SameSite=Lax');
    expect(sessionCookie).toContain('Path=/');
    const current = await request('get-session', {
      cookie: cookieHeader(response),
    });
    expect(await current.json()).toMatchObject({
      user: { id: 'existing-owner' },
    });
    expect(count('user')).toBe(1);
    expect(count('account')).toBe(1);
    expect(count('session')).toBe(2);
    expect(count('verification')).toBe(0);
    const replay = await request(
      `callback/google?state=${state}&code=synthetic-code`,
      { cookie },
    );
    expect(replay.headers.get('location')).toContain('error=');
    expect(provider.validate).toHaveBeenCalledTimes(1);
    expect(count('session')).toBe(2);
  });

  it('creates a new Google owner through the existing schema and signup hook', async () => {
    const provider = await providerFixture();
    provider.userInfo.mockResolvedValue({
      data: {
        sub: 'new-google-subject',
        email: 'new-owner@example.invalid',
        email_verified: true,
        name: 'New owner',
      },
      user: {
        id: 'new-google-subject',
        name: 'New owner',
        email: 'new-owner@example.invalid',
        emailVerified: true,
      },
    });
    const { location, cookie } = await startGoogle();
    const response = await request(
      `callback/google?state=${location.searchParams.get('state')}&code=synthetic-code`,
      { cookie },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(`${origin}/dashboard`);
    const current = await request('get-session', {
      cookie: cookieHeader(response),
    });
    expect(await current.json()).toMatchObject({
      user: { email: 'new-owner@example.invalid' },
    });
    expect(count('user')).toBe(2);
    expect(count('account')).toBe(2);
    expect(count('session')).toBe(2);
    const { ping } = await import('../src/lib/ping');
    expect(ping).toHaveBeenCalledWith(
      'signup',
      expect.objectContaining({
        title: 'new-owner@example.invalid',
      }),
    );
    expect(
      sqlite
        .prepare('SELECT aiEndpointUrl FROM user WHERE id=?')
        .get('existing-owner').aiEndpointUrl,
    ).toBe('https://model.example.invalid/v1');
  });

  it('rejects forged state and missing browser state cookies before provider exchange', async () => {
    const provider = await providerFixture();
    const forged = await request(
      'callback/google?state=forged&code=synthetic-code',
    );
    expect(forged.status).toBe(302);
    expect(forged.headers.get('location')).toContain('error=');
    const { location } = await startGoogle();
    const missingCookie = await request(
      `callback/google?state=${location.searchParams.get('state')}&code=synthetic-code`,
    );
    expect(missingCookie.headers.get('location')).toContain('error=');
    expect(provider.validate).not.toHaveBeenCalled();
    expect(count('session')).toBe(1);
  });

  it('rejects an unnamespaced pre-upgrade OAuth flow, requiring only that login to restart', async () => {
    const provider = await providerFixture();
    const state = 'synthetic-pre-upgrade-state';
    const now = Math.floor(Date.now() / 1000);
    // Exact 1.6 database state format. Existing signed session cookies are
    // qualified separately; only an OAuth flow spanning the cutover restarts.
    sqlite
      .prepare(`INSERT INTO verification
      (id,identifier,value,expiresAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?)`)
      .run(
        'legacy-flow',
        state,
        JSON.stringify({
          callbackURL: `${origin}/dashboard`,
          codeVerifier: 'synthetic-code-verifier',
          oauthState: state,
          expiresAt: Date.now() + 600000,
        }),
        now + 600,
        now,
        now,
      );
    const response = await request(
      `callback/google?state=${state}&code=synthetic-code`,
      {
        cookie: signedCookie('__Secure-better-auth.state', state),
      },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('error=state_mismatch');
    expect(provider.validate).not.toHaveBeenCalled();
    expect(count('session')).toBe(1);
    expect(count('user')).toBe(1);
    expect(count('account')).toBe(1);
  });

  it('rejects foreign origins and callback URLs without starting provider exchange', async () => {
    const body = {
      provider: 'google',
      callbackURL: `${origin}/dashboard`,
      disableRedirect: true,
    };
    const foreign = await request('sign-in/social', {
      method: 'POST',
      body,
      requestOrigin: 'https://foreign.example',
      cookie: signedCookie(
        '__Secure-better-auth.session_token',
        'existing-session-token',
      ),
    });
    expect(foreign.status).toBe(403);
    const redirect = await request('sign-in/social', {
      method: 'POST',
      body: { ...body, callbackURL: 'https://foreign.example/dashboard' },
    });
    expect(redirect.status).toBe(403);
    expect(count('verification')).toBe(0);
  });

  it('revokes a real cookie session on sign-out without deleting saved owner/account data', async () => {
    const cookie = signedCookie(
      '__Secure-better-auth.session_token',
      'existing-session-token',
    );
    const response = await request('sign-out', { method: 'POST', cookie });
    expect(response.status).toBe(200);
    expect(count('session')).toBe(0);
    expect(await (await request('get-session', { cookie })).json()).toBeNull();
    expect(count('user')).toBe(1);
    expect(count('account')).toBe(1);
    expect(
      sqlite.prepare('SELECT aiEndpointUrl FROM user').get().aiEndpointUrl,
    ).toBe('https://model.example.invalid/v1');
  });
});
