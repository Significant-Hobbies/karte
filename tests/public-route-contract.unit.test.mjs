import assert from 'node:assert/strict';
import { test } from 'vitest';

import { AGENT_SURFACE, handleAgentEdge } from '../agent-edge.mjs';
import {
  buildPublicProfilePaths,
  htmlPathFromMarkdown,
  markdownPathFor,
  parsePublicHtmlPath,
  robotsTextFor,
  STATIC_PUBLIC_ROUTES,
} from '../public-route-contract.mjs';
import { handlePublicRouteMarkdown } from '../public-route-markdown.mjs';

const STATIC_PATHS = [
  '/',
  '/about',
  '/create',
  '/faq',
  '/changelog',
  '/privacy',
  '/terms',
];

test('defines one canonical inventory of seven static public HTML routes', () => {
  assert.deepEqual(
    STATIC_PUBLIC_ROUTES.map((route) => route.path),
    STATIC_PATHS,
  );
  assert.equal(new Set(STATIC_PATHS).size, STATIC_PATHS.length);
  assert.deepEqual(
    AGENT_SURFACE.catalog.surfaces.map((surface) => surface.url),
    STATIC_PATHS.map((path) => `https://karte.cc${path}`),
  );
});

test('adds published profile modes only when enabled and ready', () => {
  const profile = {
    slug: 'sarthak',
    published: true,
    encyclopediaEnabled: true,
    newspaperEnabled: false,
    roastEnabled: true,
  };

  assert.deepEqual(
    buildPublicProfilePaths(
      profile,
      new Set(['encyclopedia', 'newspaper', 'roast']),
    ),
    ['/sarthak', '/sarthak/encyclopedia', '/sarthak/roast'],
  );
  assert.deepEqual(
    buildPublicProfilePaths({ ...profile, published: false }),
    [],
  );
});

test('keeps private and non-HTML routes outside the public document parser', () => {
  for (const path of [
    '/dashboard',
    '/dashboard/settings',
    '/login',
    '/welcome',
    '/api/ai',
    '/sarthak/agent.json',
    '/sarthak/contact.vcf',
    '/robots.txt',
  ]) {
    assert.equal(parsePublicHtmlPath(path), null, path);
  }
  assert.equal(parsePublicHtmlPath('/sarthak')?.kind, 'profile');
  assert.equal(parsePublicHtmlPath('/sarthak/encyclopedia')?.kind, 'mode');
});

test('maps each public HTML route to a stable Markdown alternate', () => {
  for (const path of STATIC_PATHS) {
    const markdown = markdownPathFor(path);
    assert.equal(htmlPathFromMarkdown(markdown), path);
  }
  assert.equal(markdownPathFor('/sarthak/roast'), '/sarthak/roast.md');
});

test('serves explicit Markdown and content negotiation with clear unavailable responses', async () => {
  const load = async (path) => `# Source\n\n${path}\n`;
  const explicit = await handlePublicRouteMarkdown(
    new Request('https://karte.cc/faq.md'),
    load,
  );
  const negotiated = await handlePublicRouteMarkdown(
    new Request('https://karte.cc/about', {
      headers: { accept: 'text/markdown, text/html;q=0.8' },
    }),
    load,
  );
  const unavailable = await handlePublicRouteMarkdown(
    new Request('https://karte.cc/missing.md'),
    async () => null,
  );

  assert.equal(explicit.status, 200);
  assert.equal(explicit.headers.get('content-location'), '/faq.md');
  assert.equal(negotiated.status, 200);
  assert.equal(negotiated.headers.get('content-location'), '/about.md');
  assert.equal(unavailable.status, 404);
  assert.match(await unavailable.text(), /No public Markdown document/);
});

test('keeps robots and the agent catalog on the current origin', async () => {
  const robots = robotsTextFor('https://preview.example');
  assert.match(robots, /Disallow: \/dashboard/);
  assert.match(robots, /Sitemap: https:\/\/preview\.example\/sitemap\.xml/);

  const response = handleAgentEdge(
    new Request('https://preview.example/api/ai'),
  );
  const catalog = await response.json();
  assert.equal(catalog.url, 'https://preview.example');
  assert.equal(catalog.surfaces.length, 7);
  assert.ok(
    catalog.surfaces.every((surface) =>
      surface.md.startsWith('https://preview.example/'),
    ),
  );
});
