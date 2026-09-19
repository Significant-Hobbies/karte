import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ db: null }));
const boundary = vi.hoisted(() => ({
  verifyTurnstile: vi.fn(),
  rateLimit: vi.fn(),
  generate: vi.fn(),
  getDefaultAiConfig: vi.fn(),
  resolveAiConfig: vi.fn(),
  buildProfileMemory: vi.fn(),
  search: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/db', () => ({
  get db() {
    return state.db;
  },
  ensureProjectsTable: async () => {},
}));
vi.mock('@/lib/turnstile', () => ({
  verifyTurnstile: boundary.verifyTurnstile,
}));
vi.mock('@/lib/rate-limit', () => ({ rateLimit: boundary.rateLimit }));
vi.mock('@/lib/ai-client', () => ({
  generate: boundary.generate,
  getDefaultAiConfig: boundary.getDefaultAiConfig,
  resolveAiConfig: boundary.resolveAiConfig,
}));
vi.mock('@/lib/knowledgebase', () => ({ search: boundary.search }));
vi.mock('@/lib/profile-memory', () => ({
  buildProfileMemory: boundary.buildProfileMemory,
}));

const { POST } = await import('../src/app/api/chat/[slug]/route');
const { pages, users } = await import('../src/db/schema');

const VISITOR_EMAIL = 'visitor@example.test';
const OWNER_EMAIL = 'owner@example.test';

let sqlite;
beforeEach(async () => {
  vi.clearAllMocks();
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync('migrations/d1')
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    sqlite.exec(readFileSync(`migrations/d1/${file}`, 'utf8'));
  }
  state.db = drizzle(async (sql, params, method) => {
    const statement = sqlite.prepare(sql);
    if (method === 'run') {
      statement.run(...params);
      return { rows: [] };
    }
    statement.setReturnArrays(true);
    return { rows: statement.all(...params) };
  });
  await state.db.insert(users).values({
    id: 'owner-1',
    name: 'Test Owner',
    email: OWNER_EMAIL,
    emailVerified: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  });
  await state.db.insert(pages).values({
    id: 'page-1',
    userId: 'owner-1',
    slug: 'test-slug',
    displayName: 'Test Owner',
    bio: 'Test Owner builds Karte. Previously built other things.',
    published: true,
    chatEnabled: true,
  });
  await state.db.insert(pages).values({
    id: 'page-2',
    userId: 'owner-1',
    slug: 'quiet-slug',
    displayName: 'Quiet Owner',
    published: true,
    chatEnabled: false,
  });
  await state.db.insert(pages).values({
    id: 'page-3',
    userId: 'owner-1',
    slug: 'draft-slug',
    displayName: 'Draft Owner',
    published: false,
    chatEnabled: true,
  });
  boundary.rateLimit.mockResolvedValue({ ok: true, remaining: 19 });
  boundary.verifyTurnstile.mockResolvedValue(true);
  boundary.getDefaultAiConfig.mockReturnValue({
    endpointUrl: 'https://ai.test/v1',
    apiKey: 'managed-key',
    model: 'model',
  });
  boundary.resolveAiConfig.mockReturnValue(null);
  boundary.buildProfileMemory.mockResolvedValue({
    promptContext: 'Public memory: Test Owner builds Karte.',
  });
  boundary.generate.mockResolvedValue('A grounded answer.');
});
afterEach(() => sqlite?.close());

const post = (slug, body) =>
  POST(
    new Request(`https://karte.cc/api/chat/${slug}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.9',
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ slug }) },
  );

const ask = (slug, query, extra = {}) =>
  post(slug, {
    query,
    visitorEmail: VISITOR_EMAIL,
    turnstileToken: 'challenge-token',
    ...extra,
  });

const rowCount = (table) =>
  sqlite.prepare(`SELECT count(*) AS total FROM ${table}`).get().total;

describe('public chat verification boundary', () => {
  it('exercises a valid challenge normally and answers from public memory', async () => {
    const response = await ask(
      'test-slug',
      'Explain the tradeoffs of static rendering',
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    expect(await response.text()).toBe('A grounded answer.');
    expect(boundary.verifyTurnstile).toHaveBeenCalledExactlyOnceWith({
      token: 'challenge-token',
      action: 'turnstile-spin-v2',
      remoteIp: '203.0.113.9',
    });
    expect(boundary.generate).toHaveBeenCalledOnce();
    const { system, prompt } = boundary.generate.mock.calls[0][1];
    expect(prompt).toBe('Explain the tradeoffs of static rendering');
    expect(system).toContain('Profile Memory');
    expect(system).toContain('Do not invent facts');
  });

  it('fails closed when verification fails and stores nothing', async () => {
    boundary.verifyTurnstile.mockResolvedValue(false);

    const response = await ask('test-slug', 'Hello', {
      turnstileToken: 'expired-token',
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Verification failed' });
    expect(boundary.verifyTurnstile).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ token: 'expired-token' }),
    );
    expect(boundary.generate).not.toHaveBeenCalled();
    expect(rowCount('conversations')).toBe(0);
    expect(rowCount('messages')).toBe(0);
  });

  it('rejects malformed and empty bodies before verification', async () => {
    expect((await post('test-slug', 'not json')).status).toBe(400);
    expect((await post('test-slug', {})).status).toBe(400);
    expect((await ask('test-slug', '   ')).status).toBe(400);
    expect(boundary.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('stops before verification when rate limited', async () => {
    boundary.rateLimit.mockResolvedValue({ ok: false, remaining: 0 });

    const response = await ask('test-slug', 'Hello');

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(boundary.verifyTurnstile).not.toHaveBeenCalled();
  });
});

describe('public chat grounding', () => {
  it.each(['quiet-slug', 'draft-slug', 'missing-slug'])(
    'rejects chat for unavailable profile %s after verification',
    async (slug) => {
      const response = await ask(slug, 'Hello');

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Chat not available' });
      expect(boundary.generate).not.toHaveBeenCalled();
    },
  );

  it('requires a visitor email after verification before generating', async () => {
    const response = await post('test-slug', {
      query: 'Explain the tradeoffs of static rendering',
      turnstileToken: 'challenge-token',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Email required to chat',
    });
    expect(boundary.generate).not.toHaveBeenCalled();
  });

  it('answers a complete owner-introduction question from the public bio without the model', async () => {
    const response = await ask('test-slug', 'Who is Test Owner?');

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('Test Owner');
    expect(text).toContain('builds Karte');
    expect(boundary.generate).not.toHaveBeenCalled();
    expect(boundary.buildProfileMemory).not.toHaveBeenCalled();
  });

  it('falls back to the deterministic public-bio answer when generation rejects', async () => {
    boundary.generate.mockRejectedValue(new Error('provider down'));

    const response = await ask(
      'test-slug',
      'Explain the tradeoffs of static rendering',
    );

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("couldn't generate a tailored answer");
    expect(text).toContain('Test Owner');
    expect(text).not.toContain(OWNER_EMAIL);
    expect(boundary.generate).toHaveBeenCalledTimes(3);
  });

  it('falls back the same way when the provider completes empty', async () => {
    boundary.generate.mockResolvedValue('');

    const response = await ask(
      'test-slug',
      'Explain the tradeoffs of static rendering',
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      "couldn't generate a tailored answer",
    );
    expect(boundary.generate).toHaveBeenCalledTimes(3);
  });

  it('reports chat unavailable when no AI endpoint is configured', async () => {
    boundary.getDefaultAiConfig.mockReturnValue(null);

    const response = await ask(
      'test-slug',
      'Explain the tradeoffs of static rendering',
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Chat not configured — AI endpoint missing',
    });
  });
});
