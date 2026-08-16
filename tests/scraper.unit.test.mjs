import { strict as assert } from 'node:assert';
import { test } from 'vitest';

import {
  decodeEntities,
  extractDomain,
  hasUsefulContent,
  isBlockedUrl,
} from '../src/lib/scraper.ts';

test('isBlockedUrl blocks loopback IPv4', () => {
  assert.equal(isBlockedUrl('http://127.0.0.1/whoami'), true);
  assert.equal(isBlockedUrl('http://127.0.0.55:8080'), true);
});

test('isBlockedUrl blocks RFC1918 ranges', () => {
  assert.equal(isBlockedUrl('http://10.0.0.5'), true);
  assert.equal(isBlockedUrl('http://172.16.0.1'), true);
  assert.equal(isBlockedUrl('http://172.31.255.255'), true);
  assert.equal(isBlockedUrl('http://192.168.1.1'), true);
});

test('isBlockedUrl allows public IPv4 (rare but pinpointed)', () => {
  assert.equal(isBlockedUrl('http://172.32.0.1'), false);
  assert.equal(isBlockedUrl('http://8.8.8.8'), false);
});

test('isBlockedUrl blocks link-local and metadata-ish hostnames', () => {
  assert.equal(isBlockedUrl('http://169.254.169.254'), true);
  assert.equal(isBlockedUrl('http://metadata.google.internal'), true);
  assert.equal(isBlockedUrl('http://my.internal.host'), true);
});

test('isBlockedUrl blocks IPv6 loopback + link-local', () => {
  assert.equal(isBlockedUrl('http://[::1]/'), true);
  assert.equal(isBlockedUrl('http://[fe80::1]/'), true);
  assert.equal(isBlockedUrl('http://[fc00::1]/'), true);
});

test('isBlockedUrl blocks localhost variants', () => {
  assert.equal(isBlockedUrl('http://localhost:3000'), true);
  assert.equal(isBlockedUrl('http://app.local/'), true);
  assert.equal(isBlockedUrl('http://thing.internal/'), true);
});

test('isBlockedUrl rejects malformed URLs', () => {
  assert.equal(isBlockedUrl('not a url'), true);
  assert.equal(isBlockedUrl(''), true);
});

test('isBlockedUrl allows ordinary public hosts', () => {
  assert.equal(isBlockedUrl('https://example.com/'), false);
  assert.equal(isBlockedUrl('https://github.com/foo/bar'), false);
});

test('decodeEntities handles named and numeric entities', () => {
  assert.equal(decodeEntities('Tom &amp; Jerry'), 'Tom & Jerry');
  assert.equal(decodeEntities('5 &lt; 10'), '5 < 10');
  assert.equal(decodeEntities('&#39;quoted&#39;'), "'quoted'");
  assert.equal(decodeEntities('hello&nbsp;world'), 'hello world');
  assert.equal(decodeEntities('&#65;&#66;'), 'AB');
});

test('decodeEntities leaves unknown entities alone', () => {
  assert.equal(decodeEntities('keep &foo; intact'), 'keep &foo; intact');
});

test('extractDomain accepts full and bare URLs', () => {
  assert.equal(extractDomain('https://github.com/foo'), 'github.com');
  assert.equal(extractDomain('github.com/foo'), 'github.com');
  assert.equal(extractDomain('not-a-url'), 'not-a-url');
});

test('hasUsefulContent rejects login-wall + JS-required shells', () => {
  assert.equal(
    hasUsefulContent({
      title: 'Sign in',
      description: '',
      content: 'Sign in to continue',
    }),
    false,
  );
  assert.equal(
    hasUsefulContent({
      title: 'JS required',
      description: '',
      content: 'Please enable JavaScript',
    }),
    false,
  );
  assert.equal(
    hasUsefulContent({
      title: 'Just a moment...',
      description: '',
      content: 'cf challenge',
    }),
    false,
  );
});

test('hasUsefulContent requires >220 chars of body text', () => {
  const short = { title: 'Page', description: '', content: 'short body' };
  assert.equal(hasUsefulContent(short), false);
  const long = {
    title: 'Page',
    description: '',
    content: 'a'.repeat(221),
  };
  assert.equal(hasUsefulContent(long), true);
});
