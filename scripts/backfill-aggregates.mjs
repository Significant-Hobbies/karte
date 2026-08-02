#!/usr/bin/env node

import {
  executeD1Statements,
  parseD1TargetArgs,
  queryD1,
} from './lib/d1-command.mjs';

export function buildAggregateStatements(events) {
  const statements = [
    'DELETE FROM dailyStats',
    'DELETE FROM dailyResourceStats',
    'DELETE FROM dailyVisitorEvents',
  ];
  const visitors = new Set();

  for (const event of events) {
    const {
      pageId,
      visitorId,
      eventType,
      resourceType,
      resourceId,
      resourceLabel,
      createdAt,
    } = event;
    const date = new Date(createdAt).toISOString().split('T')[0];
    const visitorKey = visitorId
      ? JSON.stringify([pageId, visitorId, date, eventType, resourceId ?? null])
      : null;
    const isNewVisitor = visitorKey ? !visitors.has(visitorKey) : false;

    if (visitorKey && isNewVisitor) {
      visitors.add(visitorKey);
      statements.push({
        sql: 'INSERT INTO dailyVisitorEvents (id, pageId, visitorId, date, eventType, resourceId) VALUES (?, ?, ?, ?, ?, ?)',
        args: [
          crypto.randomUUID(),
          pageId,
          visitorId,
          date,
          eventType,
          resourceId || null,
        ],
      });
    }

    const effectiveEventType =
      eventType === 'contact_submit' && !resourceId
        ? 'dm_conversion'
        : eventType;
    const visitorIncrement = isNewVisitor ? 1 : 0;

    if (resourceId && resourceType) {
      statements.push({
        sql: `INSERT INTO dailyResourceStats (id, pageId, date, eventType, resourceType, resourceId, resourceLabel, count, visitors)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
              ON CONFLICT(pageId, date, eventType, resourceId) DO UPDATE SET
                count = count + 1,
                visitors = visitors + ?,
                resourceLabel = COALESCE(?, resourceLabel)`,
        args: [
          crypto.randomUUID(),
          pageId,
          date,
          effectiveEventType,
          resourceType,
          resourceId,
          resourceLabel || null,
          visitorIncrement,
          visitorIncrement,
          resourceLabel || null,
        ],
      });
    } else {
      statements.push({
        sql: `INSERT INTO dailyStats (id, pageId, date, eventType, count, visitors)
              VALUES (?, ?, ?, ?, 1, ?)
              ON CONFLICT(pageId, date, eventType) DO UPDATE SET
                count = count + 1,
                visitors = visitors + ?`,
        args: [
          crypto.randomUUID(),
          pageId,
          date,
          effectiveEventType,
          visitorIncrement,
          visitorIncrement,
        ],
      });
    }
  }

  return statements;
}

export async function backfillAggregates(args = process.argv.slice(2)) {
  const { target, remaining } = parseD1TargetArgs(args);
  if (remaining.length) {
    throw new Error(
      'Usage: pnpm backfill:aggregates [--remote | --persist-to <directory>]',
    );
  }
  const { rows } = queryD1(
    target,
    'SELECT * FROM pageEvents ORDER BY createdAt ASC',
  );
  await executeD1Statements(target, buildAggregateStatements(rows));
  process.stdout.write(`Backfilled ${rows.length} page events.\n`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  backfillAggregates().catch((error) => {
    process.stderr.write(`Backfill failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
