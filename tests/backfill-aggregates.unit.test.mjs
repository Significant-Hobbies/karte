import assert from 'node:assert/strict';
import { test } from 'vitest';

import { buildAggregateStatements } from '../scripts/backfill-aggregates.mjs';

test('aggregate rebuild counts one visitor per unique event key', () => {
  const statements = buildAggregateStatements([
    {
      pageId: 'page-1',
      visitorId: 'visitor-1',
      eventType: 'link_click',
      resourceType: 'link',
      resourceId: 'link-1',
      resourceLabel: 'Source',
      createdAt: Date.UTC(2026, 6, 31),
    },
    {
      pageId: 'page-1',
      visitorId: 'visitor-1',
      eventType: 'link_click',
      resourceType: 'link',
      resourceId: 'link-1',
      resourceLabel: 'Source',
      createdAt: Date.UTC(2026, 6, 31, 1),
    },
  ]);

  const visitorInserts = statements.filter((statement) =>
    statement.sql?.startsWith('INSERT INTO dailyVisitorEvents'),
  );
  const resourceUpserts = statements.filter((statement) =>
    statement.sql?.startsWith('INSERT INTO dailyResourceStats'),
  );

  assert.equal(visitorInserts.length, 1);
  assert.equal(resourceUpserts.length, 2);
  assert.equal(resourceUpserts[0].args[7], 1);
  assert.equal(resourceUpserts[1].args[7], 0);
});
