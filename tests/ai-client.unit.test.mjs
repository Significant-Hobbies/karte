import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('AI client managed gateway contract', () => {
  it('uses the service binding with canonical attribution before Workers AI', () => {
    const source = read('src/lib/ai-client.ts');

    assert.match(source, /FREE_AI/);
    assert.match(source, /x-gateway-project-id': 'karte'/);
    assert.match(source, /chatModel\('auto'\)/);
    assert.match(source, /supportsStructuredOutputs: false/);
    assert.match(source, /required in production/);
    assert.match(source, /LINKCHAT_DEFAULT_AI_ENDPOINT_URL/);
    assert.match(source, /LINKCHAT_DEFAULT_AI_API_KEY/);
    assert.match(source, /LINKCHAT_DEFAULT_AI_MODEL/);
    assert.match(source, /LINKCHAT_FAST_AI_MODEL/);
    assert.doesNotMatch(source, /DEFAULT_FAST_AI_MODEL\s*=\s*'auto'/);
  });

  it('keeps fast model selection on non-gateway configured models', () => {
    const source = read('src/lib/ai-client.ts');

    assert.match(source, /reasoningLevel === 'fast'.*LINKCHAT_FAST_AI_MODEL/s);
    assert.match(source, /return config\.model/);
    assert.doesNotMatch(source, /reasoning_level/);
  });
});
