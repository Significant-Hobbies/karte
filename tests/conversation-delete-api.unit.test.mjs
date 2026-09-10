import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  loadOwnedPage: vi.fn(),
  delete: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/api-auth', () => ({
  requireUser: mocks.requireUser,
  loadOwnedPage: mocks.loadOwnedPage,
}));
vi.mock('@/db', () => ({ db: { delete: mocks.delete } }));

import { DELETE } from '../src/app/api/pages/[pageId]/conversations/[conversationId]/route';

const context = {
  params: Promise.resolve({
    pageId: 'owned-page',
    conversationId: 'selected-conversation',
  }),
};
const request = () =>
  new Request(
    'https://karte.cc/api/pages/owned-page/conversations/selected-conversation',
    { method: 'DELETE' },
  );
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ userId: 'owner' });
  mocks.loadOwnedPage.mockResolvedValue({ id: 'owned-page' });
  mocks.delete.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ returning: mocks.returning });
  mocks.returning.mockResolvedValue([{ id: 'selected-conversation' }]);
});
it('rejects unauthenticated deletion before database access', async () => {
  mocks.requireUser.mockResolvedValue({
    error: new Response(null, { status: 401 }),
  });
  expect((await DELETE(request(), context)).status).toBe(401);
  expect(mocks.delete).not.toHaveBeenCalled();
});
it('rejects a page not owned by the caller', async () => {
  mocks.loadOwnedPage.mockResolvedValue(null);
  expect((await DELETE(request(), context)).status).toBe(404);
  expect(mocks.loadOwnedPage).toHaveBeenCalledWith('owned-page', 'owner');
  expect(mocks.delete).not.toHaveBeenCalled();
});
it('scopes the delete to both the selected conversation and owned page', async () => {
  expect((await DELETE(request(), context)).status).toBe(204);
  const query = new SQLiteSyncDialect().sqlToQuery(
    mocks.where.mock.calls[0][0],
  );
  expect(query.sql).toContain('"conversations"."id" = ?');
  expect(query.sql).toContain('"conversations"."pageId" = ?');
  expect(query.params).toEqual(['selected-conversation', 'owned-page']);
});
it('reports a missing or differently owned conversation without success', async () => {
  mocks.returning.mockResolvedValue([]);
  expect((await DELETE(request(), context)).status).toBe(404);
});
