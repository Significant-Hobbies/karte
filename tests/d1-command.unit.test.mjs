import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  bindSql,
  parseD1TargetArgs,
  sqlValue,
} from '../scripts/lib/d1-command.mjs';

test('D1 operator commands default to local state', () => {
  assert.deepEqual(parseD1TargetArgs(['--']), {
    target: { remote: false, persistTo: undefined },
    remaining: [],
  });
});

test('remote D1 access must be explicit and cannot use local persistence', () => {
  assert.deepEqual(parseD1TargetArgs(['--remote', '--apply']), {
    target: { remote: true, persistTo: undefined },
    remaining: ['--apply'],
  });
  assert.throws(
    () => parseD1TargetArgs(['--remote', '--persist-to', '/tmp/karte']),
    /cannot be combined/,
  );
});

test('SQL values are escaped without exposing a client dependency', () => {
  assert.equal(sqlValue("Karte's page"), "'Karte''s page'");
  assert.equal(sqlValue(null), 'NULL');
  assert.equal(sqlValue(true), '1');
  assert.equal(sqlValue(42), '42');
});

test('bindSql replaces only unquoted placeholders', () => {
  assert.equal(
    bindSql("SELECT '?' AS literal FROM pages WHERE slug = ? AND id = ?", [
      "owner's-page",
      'page-1',
    ]),
    "SELECT '?' AS literal FROM pages WHERE slug = 'owner''s-page' AND id = 'page-1'",
  );
  assert.throws(() => bindSql('SELECT ?', []), /more placeholders/);
  assert.throws(() => bindSql('SELECT 1', ['unused']), /fewer placeholders/);
});
