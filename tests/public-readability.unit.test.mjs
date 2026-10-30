import React from 'react';
import { beforeEach, expect, test, vi } from 'vitest';

const state = vi.hoisted(() => ({ data: null, generated: null, routes: [] }));
vi.mock('server-only', () => ({}));
vi.mock('@/app/sitemap', () => ({ default: async () => state.routes }));
vi.mock('next/font/google', () => ({
  Instrument_Serif: () => ({ style: { fontFamily: 'serif' } }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/lib/auth-client', () => ({ authClient: {} }));
vi.mock('@/app/[slug]/_lib/get-page-data', () => ({
  getFreshPublicPageData: async () => state.data,
  getGeneratedPage: async () => state.generated,
}));

import { ARTICLES } from '../content-pages/articles.mjs';
import home from '../landing-astro/src/content/home.json';
import {
  onyxExamples,
  onyxSteps,
  onyxSurfaces,
} from '../landing-astro/src/content/onyx-deck';
import {
  robotsTextFor,
  STATIC_PUBLIC_ROUTES,
} from '../public-route-contract.mjs';
import { handlePublicRouteMarkdown } from '../public-route-markdown.mjs';
import { GET as discovery } from '../src/app/api/ai/discovery/route';
import { renderPublicRouteMarkdown } from '../src/lib/public-route-markdown';
import { reactSourceMarkdown } from '../src/lib/react-source-markdown';
import { richSourceMarkdown } from '../src/lib/rich-source-markdown';

globalThis.React = React;
beforeEach(() => {
  state.data = null;
  state.generated = null;
});
function profile() {
  return {
    page: {
      id: 'public-id',
      slug: 'public-person',
      displayName: 'Public Person',
      bio: 'Published biography',
      avatarUrl: null,
      location: 'Public location',
      dmMode: 'off',
      chatEnabled: false,
      petEnabled: false,
      pageType: 'person',
      themeConfig: null,
      calendarUrl: 'https://cal.com/public-person',
      newsletterUrl: null,
      tipUrl: null,
      encyclopediaEnabled: true,
      newspaperEnabled: true,
      roastEnabled: true,
      agentApiKey: 'PRIVATE_KEY_CANARY',
    },
    user: { email: 'PRIVATE_EMAIL_CANARY' },
    links: [
      {
        id: 'link',
        title: 'Public site',
        url: 'https://example.com/work',
        icon: null,
      },
    ],
    projects: [
      {
        id: 'project',
        title: 'Public project',
        url: 'https://example.com/project',
        description: 'Project details',
        imageUrl: null,
      },
    ],
    sections: [
      {
        id: 'section',
        type: 'text',
        title: 'Published section',
        content: 'Public section body',
        buttonLabel: 'Visit',
        buttonUrl: 'https://example.com',
      },
    ],
    timeline: [],
    readyPages: new Set(),
    modePreviews: {},
    modeContent: {},
  };
}
test('renders the complete static route and article inventory from source', async () => {
  for (const path of [
    ...STATIC_PUBLIC_ROUTES.map((route) => route.path),
    ...ARTICLES.map((article) => `/articles/${article.slug}`),
  ]) {
    const markdown = await renderPublicRouteMarkdown(path);
    expect(markdown, path).toBeTruthy();
    expect(markdown.length, path).toBeGreaterThan(150);
  }
  const markdown = await renderPublicRouteMarkdown('/');
  for (const section of home.sections)
    expect(markdown).toContain(section.title);
  expect(markdown).toContain(home.closing.form.label);
  for (const item of [...onyxSteps, ...onyxSurfaces, ...onyxExamples])
    expect(markdown).toContain(item.body);
  for (const example of onyxExamples)
    expect(markdown).toContain(`https://karte.cc${example.href}`);
});
test('anonymous creation exposes the authored empty form without browser state', async () => {
  const markdown = await renderPublicRouteMarkdown('/create');
  for (const copy of [
    'Draft your profile first.',
    'Build Your Profile',
    'Live preview',
    'Page URL',
    'Avatar Image',
    'Atelier Noir',
    'Continue to Claim Username',
    'Import & Preview',
    'Have a quick chat',
  ])
    expect(markdown).toContain(copy);
  expect(markdown).not.toContain('PRIVATE');
});
test('published profiles reuse their public view without serializing owner records', async () => {
  state.data = profile();
  const markdown = await renderPublicRouteMarkdown('/public-person');
  for (const copy of [
    'Public Person',
    'Published biography',
    'Public project',
    'Public section body',
    'https://cal.com/public-person',
    'https://example.com/work',
  ])
    expect(markdown).toContain(copy);
  expect(markdown).not.toContain('PRIVATE_');
  state.data = null;
  expect(await renderPublicRouteMarkdown('/public-person')).toBeNull();
});
test('profile modes require current publication, enabled mode and ready content', async () => {
  state.data = profile();
  state.generated = { status: 'ready', content: { roast: 'Published roast' } };
  expect(await renderPublicRouteMarkdown('/public-person/roast')).toBeNull();
  state.data.readyPages.add('roast');
  state.data.page.roastEnabled = false;
  expect(await renderPublicRouteMarkdown('/public-person/roast')).toBeNull();
  state.data.page.roastEnabled = true;
  state.generated.status = 'generating';
  expect(await renderPublicRouteMarkdown('/public-person/roast')).toBeNull();
  state.generated.status = 'ready';
  expect(await renderPublicRouteMarkdown('/public-person/roast')).toContain(
    'Published roast',
  );
});
test('newspaper and roast representations preserve every published content field', async () => {
  state.data = profile();
  state.data.readyPages = new Set(['newspaper', 'roast']);
  state.generated = {
    status: 'ready',
    content: {
      mastheadName: 'Daily fixture',
      dateline: 'Today',
      pages: [
        {
          sectionLabel: 'Front page',
          leadStory: {
            headline: 'Lead',
            subheadline: 'Subhead',
            body: 'Body',
            pullQuote: 'Quote',
          },
          secondaryStories: [{ headline: 'Secondary', body: 'Secondary body' }],
          sidebar: { facts: ['Unique fact'], mood: 'Unique mood' },
          fakeAds: ['Unique ad'],
        },
      ],
    },
  };
  const paper = await renderPublicRouteMarkdown('/public-person/newspaper');
  for (const text of [
    'Subhead',
    'Secondary body',
    'Quote',
    'Unique fact',
    'Unique mood',
    'Unique ad',
  ])
    expect(paper).toContain(text);
  state.generated.content = {
    roast: 'Roast body',
    vibeScore: 7,
    personalityType: 'Fixture',
    redFlags: ['Flag'],
    bestLink: { title: 'Best', reason: 'Best reason' },
    worstLink: { title: 'Worst', reason: 'Worst reason' },
    spiritPlatform: 'Spirit',
    celebrityMatch: 'Celebrity',
    bioAutopsy: 'Autopsy',
    firstImpression: 'Impression',
  };
  const roast = await renderPublicRouteMarkdown('/public-person/roast');
  for (const text of [
    'Best reason',
    'Worst reason',
    'Spirit',
    'Celebrity',
    'Autopsy',
    'Impression',
    'Flag',
  ])
    expect(roast).toContain(text);
});
test('stored rich-text source keeps links, emphasis, code and semantic tables', () => {
  const result = richSourceMarkdown(
    '<h2>Heading</h2><p><strong>Bold</strong> &amp; <a href="/about">About</a></p><pre><code>x &lt; 3\nnext()</code></pre><table><tr><th>Name</th><th>Value</th></tr><tr><td>One</td><td>Two</td></tr></table><script>PRIVATE_SCRIPT</script>',
  );
  expect(result).toContain('## Heading');
  expect(result).toContain('**Bold**');
  expect(result).toContain('[About](https://karte.cc/about)');
  expect(result).toContain('x < 3\nnext()');
  expect(result).toContain('| Name | Value |');
  expect(result).toContain('| One | Two |');
  expect(result).not.toContain('PRIVATE_SCRIPT');
});
test('authored React source fails unreviewed components and excludes hidden chrome', () => {
  expect(() =>
    reactSourceMarkdown(
      React.createElement(
        'main',
        null,
        React.createElement(() => 'unexpected'),
      ),
      { origin: 'https://karte.cc', components: [] },
    ),
  ).toThrow('Unreviewed');
  const body = reactSourceMarkdown(
    React.createElement(
      'main',
      null,
      React.createElement('p', null, 'Public'),
      React.createElement('div', { hidden: true }, 'Hidden'),
      React.createElement('nav', null, 'Chrome'),
    ),
    { origin: 'https://karte.cc', components: [] },
  );
  expect(body).toBe('Public');
});
test('transport honors negotiation quality, aliases, canonical metadata and private cache', async () => {
  const load = async () => '# Public\n';
  expect(
    await handlePublicRouteMarkdown(
      new Request('https://karte.cc/about', {
        headers: { accept: 'text/html;q=1, text/markdown;q=0.5' },
      }),
      load,
    ),
  ).toBeNull();
  for (const path of [
    '/public-person.md',
    '/api/md/public-person',
    '/public-person',
  ]) {
    const response = await handlePublicRouteMarkdown(
      new Request(`https://karte.cc${path}`, {
        headers: { accept: 'text/markdown' },
      }),
      load,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-location')).toBe(
      'https://karte.cc/public-person',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-markdown-tokens')).toBeTruthy();
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  }
  for (const path of ['/dashboard.md', '/api/md/dashboard', '/dashboard'])
    expect(
      (
        await handlePublicRouteMarkdown(
          new Request(`https://karte.cc${path}`, {
            headers: { accept: 'text/markdown' },
          }),
          load,
        )
      ).status,
    ).toBe(404);
});
test('all six training crawlers allow public pages while preserving private exclusions', () => {
  const robots = robotsTextFor('https://karte.cc');
  for (const bot of [
    'GPTBot',
    'ClaudeBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
    'Bytespider',
  ])
    expect(robots).toContain(`User-agent: ${bot}`);
  expect(robots).toContain('Disallow: /dashboard');
});

test('owner contact links render while unsafe destinations retain visible text', () => {
  for (const href of [
    'tel:+1234',
    'sms:+1234',
    'javascript:alert(1)',
    'http://[',
  ]) {
    const text = reactSourceMarkdown(
      React.createElement(
        'main',
        null,
        React.createElement('a', { href }, 'Contact owner'),
      ),
      { origin: 'https://karte.cc', components: [] },
    );
    expect(text).toContain('Contact owner');
    if (href.startsWith('tel:') || href.startsWith('sms:'))
      expect(text).toContain(href);
    else expect(text).not.toContain(href);
  }
});
test('published reserved-word profiles cannot poison discovery and guidance is retained', async () => {
  state.routes = [
    { url: 'https://karte.cc/admin' },
    { url: 'https://karte.cc/api' },
    { url: 'https://karte.cc/dashboard' },
    { url: 'https://karte.cc/auth/roast' },
  ];
  const index = await discovery(
    new Request('https://karte.cc/api/ai/discovery?path=/llms.txt'),
  );
  expect(index.status).toBe(200);
  const text = await index.text();
  expect(text).toContain('https://karte.cc/admin.md');
  expect(text).toContain('https://karte.cc/skill.md');
  expect(text).toContain('Private facts about a profile owner');
  expect(text.indexOf('## Agent profile workflow')).toBeGreaterThan(
    text.indexOf('## Do not use this for'),
  );
  expect(text.indexOf('https://karte.cc/skill.md')).toBeGreaterThan(
    text.indexOf('## Agent profile workflow'),
  );
  expect(text).not.toContain('https://karte.cc/dashboard.md');
  expect(text).not.toContain('https://karte.cc/api.md');
  state.routes = [];
  const full = await discovery(
    new Request('https://karte.cc/api/ai/discovery?path=/llms-full.txt'),
  );
  const fullText = await full.text();
  expect(fullText.indexOf('## Agent profile workflow')).toBeGreaterThan(
    fullText.indexOf('## Do not use this for'),
  );
  expect(fullText.indexOf('https://karte.cc/skill.md')).toBeGreaterThan(
    fullText.indexOf('## Agent profile workflow'),
  );
  expect(fullText).toContain('## Privacy and authority boundary');
});

test('temporary Markdown source failure is no-store503 rather than absence', async () => {
  const response = await handlePublicRouteMarkdown(
    new Request('https://karte.cc/public-person.md'),
    async () => {
      throw new Error('Source unavailable');
    },
  );
  expect(response.status).toBe(503);
  expect(response.headers.get('cache-control')).toBe('no-store');
});
