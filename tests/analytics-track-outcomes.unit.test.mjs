import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ db: null }));

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => null }),
}));
vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => ({ env: {} }),
}));
vi.mock('@/db', () => ({
  get db() {
    return state.db;
  },
  ensureProjectsTable: async () => {},
}));
vi.mock('@/lib/analytics-aggregates', () => ({
  recordAggregate: vi.fn(),
}));

const { POST } = await import('../src/app/api/track/[slug]/route');
const { pages, users } = await import('../src/db/schema');

let sqlite;
beforeEach(async () => {
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
    email: 'owner@example.test',
    emailVerified: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  });
  await state.db.insert(pages).values({
    id: 'page-1',
    userId: 'owner-1',
    slug: 'test-slug',
    displayName: 'Test Owner',
    published: true,
  });
});
afterEach(() => sqlite?.close());

async function post(eventType, metadata) {
  return POST(
    new Request('https://karte.cc/api/track/test-slug', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        eventType,
        visitorId: 'opaque-visitor-1',
        metadata,
      }),
    }),
    { params: Promise.resolve({ slug: 'test-slug' }) },
  );
}

describe('chat outcome analytics ingestion', () => {
  it('accepts privacy-bounded question and delivered-answer events for the same existing visitor ID', async () => {
    const question = await post('chat_question_submitted', {
      profileVariant: 'proof',
      trafficLabel: 'internal',
    });
    const answer = await post('chat_answer_outcome', {
      profileVariant: 'proof',
      trafficLabel: 'internal',
      outcome: 'delivered',
    });

    expect(question.status).toBe(201);
    expect(answer.status).toBe(201);
    const rows = sqlite
      .prepare(
        'SELECT visitorId, eventType, metadata FROM pageEvents ORDER BY createdAt ASC, eventType ASC',
      )
      .all();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.visitorId)).toEqual([
      'opaque-visitor-1',
      'opaque-visitor-1',
    ]);
    expect(rows.map((row) => row.eventType).sort()).toEqual([
      'chat_answer_outcome',
      'chat_question_submitted',
    ]);
    expect(rows.map((row) => JSON.parse(row.metadata))).toContainEqual({
      profileVariant: 'proof',
      trafficLabel: 'internal',
      outcome: 'delivered',
    });
    expect(rows.some((row) => row.metadata.includes('question text'))).toBe(
      false,
    );
  });

  it('rejects unrecognized event names without recording them', async () => {
    const response = await post('chat_answer_success', {
      outcome: 'delivered',
    });

    expect(response.status).toBe(400);
    expect(
      sqlite.prepare('SELECT count(*) AS total FROM pageEvents').get().total,
    ).toBe(0);
  });
});
