import { strict as assert } from 'node:assert';
import { test } from 'vitest';

import {
  getDnsInstructions,
  isAppHost,
  normalizeHostname,
} from '../src/lib/hostname.ts';

test('normalizeHostname accepts apex domains', () => {
  assert.equal(normalizeHostname('example.com'), 'example.com');
  assert.equal(normalizeHostname('  Example.COM '), 'example.com');
});

test('normalizeHostname strips www prefix and trailing dot', () => {
  assert.equal(normalizeHostname('www.example.com'), 'example.com');
  assert.equal(normalizeHostname('example.com.'), 'example.com');
});

test('normalizeHostname extracts host from URL', () => {
  assert.equal(normalizeHostname('https://example.com/path'), 'example.com');
  assert.equal(
    normalizeHostname('http://sub.example.co.uk'),
    'sub.example.co.uk',
  );
});

test('normalizeHostname rejects ports, paths, and bad input', () => {
  assert.equal(normalizeHostname(''), null);
  assert.equal(normalizeHostname('   '), null);
  assert.equal(normalizeHostname('example.com:8080'), null);
  assert.equal(normalizeHostname('example.com/x'), null);
  assert.equal(normalizeHostname('not a host'), null);
  assert.equal(normalizeHostname('-leading.com'), null);
  assert.equal(normalizeHostname(`${'a'.repeat(254)}.com`), null);
  assert.equal(normalizeHostname(null), null);
  assert.equal(normalizeHostname(123), null);
});

test('normalizeHostname accepts subdomains', () => {
  assert.equal(normalizeHostname('blog.example.com'), 'blog.example.com');
  assert.equal(normalizeHostname('a.b.c.example.com'), 'a.b.c.example.com');
});

test('isAppHost matches localhost and platform hosts', () => {
  assert.equal(isAppHost('localhost', null), true);
  assert.equal(isAppHost('localhost:3000', null), true);
  assert.equal(isAppHost('127.0.0.1', null), true);
  assert.equal(isAppHost('linkchat.sarthakagrawal927.workers.dev', null), true);
  assert.equal(isAppHost('myapp.vercel.app', null), true);
});

test('isAppHost matches configured NEXT_PUBLIC_APP_URL apex and www', () => {
  assert.equal(isAppHost('linkchat.app', 'linkchat.app'), true);
  assert.equal(isAppHost('www.linkchat.app', 'linkchat.app'), true);
  assert.equal(isAppHost('linkchat.app', 'www.linkchat.app'), true);
});

test('isAppHost rejects unrelated custom domains', () => {
  assert.equal(isAppHost('example.com', 'linkchat.app'), false);
  assert.equal(isAppHost('', 'linkchat.app'), false);
});

test('getDnsInstructions returns CNAME records for apex', () => {
  const recs = getDnsInstructions('example.com');
  assert.equal(recs.length, 2);
  assert.equal(recs[0].type, 'CNAME');
  assert.equal(recs[0].name, '@');
  assert.equal(recs[1].type, 'CNAME');
  assert.equal(recs[1].name, 'www');
  assert.equal(recs[0].value, recs[1].value);
  assert.ok(recs[0].value);
});

test('getDnsInstructions returns single CNAME for subdomain', () => {
  const recs = getDnsInstructions('blog.example.com');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].type, 'CNAME');
  assert.equal(recs[0].name, 'blog');
});

test('getDnsInstructions handles public-suffix apex domains', () => {
  const recs = getDnsInstructions('example.co.uk');
  assert.equal(recs.length, 2);
  assert.equal(recs[0].name, '@');
  assert.equal(recs[1].name, 'www');
});
