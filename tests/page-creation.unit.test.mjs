import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  db: null,
  userId: 'new-owner',
  authenticated: true,
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/api-auth', () => ({
  requireUser: async () =>
    state.authenticated
      ? { userId: state.userId }
      : { error: new Response(null, { status: 401 }) },
}));
vi.mock('@/db', () => ({
  get db() {
    return state.db;
  },
  ensureProjectsTable: async () => {},
}));

import { GET, POST } from '../src/app/api/pages/route';

let sqlite;
beforeEach(() => {
  state.userId = 'new-owner';
  state.authenticated = true;
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync('migrations/d1')
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    sqlite.exec(readFileSync(`migrations/d1/${file}`, 'utf8'));
  }
  sqlite
    .prepare(
      'INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run('new-owner', 'New Owner', 'owner@example.test', 1, 0, 0);
  state.db = drizzle(async (sql, params, method) => {
    const statement = sqlite.prepare(sql);
    if (method === 'run') {
      statement.run(...params);
      return { rows: [] };
    }
    statement.setReturnArrays(true);
    return { rows: statement.all(...params) };
  });
});
afterEach(() => sqlite?.close());
const create = (body) =>
  POST(
    new Request('https://karte.cc/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

it('creates a persisted private draft owned by the authenticated new creator', async () => {
  const response = await create({
    slug: 'new-profile',
    displayName: 'New Owner',
    bio: 'My first profile',
  });
  expect(response.status).toBe(201);
  const page = await response.json();
  expect(page.userId).toBe('new-owner');
  expect(page.published).toBe(false);
  expect((await (await GET()).json()).map((item) => item.slug)).toEqual([
    'new-profile',
  ]);
  state.userId = 'different-owner';
  expect(await (await GET()).json()).toEqual([]);
});
it('preserves an existing profile when the requested slug is taken', async () => {
  await create({ slug: 'claimed-profile', displayName: 'Original' });
  const response = await create({
    slug: 'claimed-profile',
    displayName: 'Replacement',
  });
  expect(response.status).toBe(409);
  expect(
    sqlite.prepare('SELECT displayName FROM pages').get().displayName,
  ).toBe('Original');
});
it('does not create a profile before authentication', async () => {
  state.authenticated = false;
  expect(
    (await create({ slug: 'new-profile', displayName: 'New Owner' })).status,
  ).toBe(401);
  expect(
    sqlite.prepare('SELECT count(*) AS total FROM pages').get().total,
  ).toBe(0);
});
