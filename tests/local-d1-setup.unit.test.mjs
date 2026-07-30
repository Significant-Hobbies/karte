import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { describe, it } from 'vitest';

import { parseArgs } from '../scripts/setup-local-d1.mjs';

describe('local D1 setup safety', () => {
  it('rejects remote access and unknown arguments', () => {
    assert.throws(
      () => parseArgs(['--remote']),
      /Remote D1 access is not allowed/,
    );
    assert.throws(
      () => parseArgs(['--config', 'wrangler.jsonc']),
      /Unknown argument/,
    );
  });

  it('accepts an optional persistence directory', () => {
    assert.equal(parseArgs([]), undefined);
    assert.equal(parseArgs(['--']), undefined);
    assert.equal(
      parseArgs(['--persist-to', '/tmp/karte-d1-test']),
      '/tmp/karte-d1-test',
    );
  });

  it('pins the local config to the current D1 migration directory', async () => {
    const config = await readFile(
      new URL('../wrangler.local.jsonc', import.meta.url),
      'utf8',
    );
    const fkIndexes = await readFile(
      new URL('../migrations/d1/008_fk_indexes.sql', import.meta.url),
      'utf8',
    );

    assert.match(config, /"migrations_dir": "migrations\/d1"/);
    assert.doesNotMatch(config, /"routes"|"vars"|"remote"/);
    assert.doesNotMatch(fkIndexes, /ON agentAuthCodes\(userId\)/);
  });
});
