import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('AI client direct-provider contract', () => {
  it('requires explicit project-owned endpoint, key, and model', () => {
    const source = read('src/lib/ai-client.ts');

    assert.match(source, /LINKCHAT_DEFAULT_AI_ENDPOINT_URL/);
    assert.match(source, /LINKCHAT_DEFAULT_AI_API_KEY/);
    assert.match(source, /LINKCHAT_DEFAULT_AI_MODEL/);
    assert.match(source, /LINKCHAT_FAST_AI_MODEL/);
    assert.doesNotMatch(source, /ai-gateway\.sassmaker\.com/);
    assert.doesNotMatch(source, /x-gateway-project-id/);
    assert.doesNotMatch(source, /DEFAULT_FAST_AI_MODEL\s*=\s*'auto'/);
  });

  it('uses the optional fast model without gateway-specific request fields', () => {
    const source = read('src/lib/ai-client.ts');

    assert.match(source, /reasoningLevel === 'fast'.*LINKCHAT_FAST_AI_MODEL/s);
    assert.match(source, /return config\.model/);
    assert.doesNotMatch(source, /reasoning_level/);
    assert.doesNotMatch(source, /project_id/);
  });
});
