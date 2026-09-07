import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
  where: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/api-auth', () => ({
  requireUser: async () => ({ userId: 'owner' }),
  loadOwnedPage: async () => ({ id: 'page' }),
}));
vi.mock('@/db', () => ({
  ensureProjectsTable: async () => {},
  db: {
    insert: mocks.insert,
    update: mocks.update,
    select: () => ({ from: () => ({ where: mocks.where }) }),
  },
}));

import { PUT } from '../src/app/api/pages/[pageId]/sections/[sectionId]/route';
import { POST } from '../src/app/api/pages/[pageId]/sections/route';

const context = {
  params: Promise.resolve({ pageId: 'page', sectionId: 'section' }),
};
const body = {
  type: 'cta',
  title: 'Book',
  content: 'Schedule a conversation',
  buttonLabel: 'Book',
  buttonUrl: 'https://calendar.google.com/schedules/truncated...',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.where.mockResolvedValue([{ ...body, id: 'section' }]);
});
it.each([
  ['POST', POST],
  ['PUT', PUT],
])('%s rejects truncated links before writing', async (method, handler) => {
  const response = await handler(
    new Request('http://localhost', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    context,
  );
  expect(response.status).toBe(400);
  expect((await response.json()).error).toContain('complete HTTP or HTTPS');
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});
