import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'vitest';

import { AGENT_SURFACE, handleAgentEdge } from '../agent-edge.mjs';
import {
  AI_LINK_IN_BIO_MARKDOWN,
  AI_LINK_IN_BIO_PAGE,
} from '../content-pages/ai-link-in-bio.mjs';
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
  '/ai-link-in-bio',
  '/faq',
  '/changelog',
  '/privacy',
  '/terms',
];
const ASTRO_CONTENT_PATHS = ['/', '/ai-link-in-bio', '/changelog', '/faq'];

function quotedValues(source, pattern, label) {
  const block = source.match(pattern);
  assert.ok(block, `${label} must remain an explicit array`);
  return [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

test('defines one canonical inventory of eight static public HTML routes', () => {
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

test('keeps the AI link-in-bio source substantive and aligned with discovery', () => {
  assert.equal(AI_LINK_IN_BIO_PAGE.path, '/ai-link-in-bio');
  assert.equal(
    AI_LINK_IN_BIO_PAGE.canonicalUrl,
    'https://karte.cc/ai-link-in-bio',
  );
  for (const expected of [
    'Conventional link-in-bio vs conversational profile',
    'What agents can inspect',
    'Public and private boundaries',
    'Frequently asked questions',
    'Sources and next steps',
    'Draft your Karte profile',
  ]) {
    assert.match(AI_LINK_IN_BIO_MARKDOWN, new RegExp(expected));
  }

  const catalog = JSON.parse(
    readFileSync(new URL('../public/api-ai.json', import.meta.url), 'utf8'),
  );
  const matches = catalog.surfaces.filter(
    (surface) => surface.url === AI_LINK_IN_BIO_PAGE.canonicalUrl,
  );
  assert.equal(matches.length, 1);
  assert.equal(matches[0].md, 'https://karte.cc/ai-link-in-bio.md');
  assert.match(AGENT_SURFACE.llmsTxt, /https:\/\/karte\.cc\/ai-link-in-bio/);
  assert.match(
    AGENT_SURFACE.llmsFullTxt,
    /https:\/\/karte\.cc\/ai-link-in-bio/,
  );
  assert.match(AGENT_SURFACE.indexMd, /https:\/\/karte\.cc\/ai-link-in-bio/);
});

test('serves the AI link-in-bio Astro asset before the profile catch-all', () => {
  const worker = readFileSync(
    new URL('../worker.mjs', import.meta.url),
    'utf8',
  );
  for (const setName of ['CACHEABLE_EXACT', 'ASTRO_ASSET_PATHS']) {
    const block = worker.match(
      new RegExp(`const ${setName} = new Set\\(\\[([\\s\\S]*?)\\]\\);`),
    );
    assert.ok(block, `${setName} must remain an explicit array-backed set`);
    assert.match(block[1], /['"]\/ai-link-in-bio['"]/);
  }
});

test('routes every Astro content path through the Worker before Static Assets', () => {
  const worker = readFileSync(
    new URL('../worker.mjs', import.meta.url),
    'utf8',
  );
  const wrangler = readFileSync(
    new URL('../wrangler.jsonc', import.meta.url),
    'utf8',
  );
  const workerPaths = quotedValues(
    worker,
    /const ASTRO_ASSET_PATHS = new Set\(\[([\s\S]*?)\]\);/,
    'ASTRO_ASSET_PATHS',
  );
  const workerFirstPaths = quotedValues(
    wrangler,
    /"run_worker_first"\s*:\s*\[([\s\S]*?)\]/,
    'assets.run_worker_first',
  );

  assert.deepEqual(workerPaths, ASTRO_CONTENT_PATHS);
  assert.deepEqual(workerFirstPaths, ASTRO_CONTENT_PATHS);
});

test('does not precompress Astro assets before Cloudflare content negotiation', () => {
  const worker = readFileSync(
    new URL('../worker.mjs', import.meta.url),
    'utf8',
  );
  const astroAssetBlock = worker.match(
    /if \(env\.ASSETS && ASTRO_ASSET_PATHS\.has\(url\.pathname\)\) \{([\s\S]*?)\n {6}\}\n\n {6}const cache/u,
  );
  assert.ok(astroAssetBlock, 'Astro asset branch must remain explicit');
  assert.doesNotMatch(astroAssetBlock[1], /CompressionStream/u);
  assert.doesNotMatch(astroAssetBlock[1], /content-encoding/iu);
  assert.doesNotMatch(astroAssetBlock[1], /encodeBody/u);
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
  assert.equal(catalog.surfaces.length, 8);
  assert.ok(
    catalog.surfaces.every((surface) =>
      surface.md.startsWith('https://preview.example/'),
    ),
  );
});
