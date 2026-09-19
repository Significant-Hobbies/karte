import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  page: null,
  generated: null,
  session: null,
}));

const NOT_FOUND = { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' };

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    const error = new Error('notFound');
    error.digest = 'NEXT_HTTP_ERROR_FALLBACK;404';
    throw error;
  },
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }) =>
    React.createElement('a', props, children),
}));
vi.mock('@/lib/auth-server', () => ({
  getSession: async () => state.session,
}));
vi.mock('@/lib/profile-mode-metadata', () => ({
  metadataForProfileMode: async () => ({}),
}));
vi.mock('../src/app/[slug]/_lib/get-page-data', () => ({
  getPageBySlug: async () => state.page,
  getGeneratedPage: async () => state.generated,
  getPageLinks: async () => [],
  getPageProjects: async () => [],
}));
vi.mock('@/components/public/generating-placeholder', () => ({
  GeneratingPlaceholder: ({ variant }) =>
    React.createElement('div', null, `GENERATING_${variant}`),
}));
vi.mock('@/components/public/encyclopedia/generate-encyclopedia', () => ({
  GenerateEncyclopedia: () =>
    React.createElement('div', null, 'GENERATE_ENCYCLOPEDIA'),
}));
vi.mock('@/components/public/encyclopedia/wiki-article', () => ({
  WikiArticle: ({ content }) =>
    React.createElement(
      'article',
      null,
      `ARTICLE:${content.markdown.replace(/<[^>]+>/g, '')}`,
    ),
}));
vi.mock('@/components/public/newspaper/generate-newspaper', () => ({
  GenerateNewspaper: () =>
    React.createElement('div', null, 'GENERATE_NEWSPAPER'),
}));
vi.mock('@/components/public/newspaper/newspaper-front-page', () => ({
  NewspaperFrontPage: ({ content }) =>
    React.createElement('article', null, `FRONTPAGE:${content.mastheadName}`),
}));
vi.mock('@/components/public/roast/roast-page-client', () => ({
  RoastPageClient: ({ existingRoast }) =>
    React.createElement('div', null, `ROAST:${existingRoast?.roast ?? 'none'}`),
}));

const { default: EncyclopediaPage } = await import(
  '../src/app/[slug]/encyclopedia/page'
);
const { default: NewspaperPage } = await import(
  '../src/app/[slug]/newspaper/page'
);
const { default: RoastPage } = await import('../src/app/[slug]/roast/page');

const page = (overrides = {}) => ({
  id: 'page-1',
  userId: 'owner-1',
  slug: 'test-slug',
  displayName: 'Test Owner',
  avatarUrl: null,
  themeConfig: null,
  bio: 'public bio',
  encyclopediaEnabled: true,
  newspaperEnabled: true,
  roastEnabled: true,
  ...overrides,
});

const params = Promise.resolve({ slug: 'test-slug' });
const html = async (Page) => renderToStaticMarkup(await Page({ params }));

const MODES = [
  {
    name: 'encyclopedia',
    Page: EncyclopediaPage,
    flag: 'encyclopediaEnabled',
    ready: {
      markdown: '<p>Public article body</p>',
      infobox: {},
      categories: [],
    },
    readyMarker: 'ARTICLE:Public article body',
    generateMarker: 'GENERATE_ENCYCLOPEDIA',
  },
  {
    name: 'newspaper',
    Page: NewspaperPage,
    flag: 'newspaperEnabled',
    ready: {
      mastheadName: 'The Daily Owner',
      leadStory: { headline: 'Owner ships Karte' },
    },
    readyMarker: 'FRONTPAGE:The Daily Owner',
    generateMarker: 'GENERATE_NEWSPAPER',
  },
  {
    name: 'roast',
    Page: RoastPage,
    flag: 'roastEnabled',
    ready: { roast: 'Owner ships too much.' },
    readyMarker: 'ROAST:Owner ships too much.',
    generateMarker: 'ROAST:none',
  },
];

beforeEach(() => {
  state.page = page();
  state.generated = null;
  state.session = null;
});

describe.each(MODES)('$name mode gating', (mode) => {
  it('404s for everyone when the mode is disabled', async () => {
    state.page = page({ [mode.flag]: false });

    await expect(mode.Page({ params })).rejects.toMatchObject(NOT_FOUND);
  });

  it('404s when the profile itself is not public', async () => {
    state.page = null;

    await expect(mode.Page({ params })).rejects.toMatchObject(NOT_FOUND);
  });

  it('shows visitors a generating placeholder instead of a 404', async () => {
    state.generated = { status: 'generating', content: null };

    expect(await html(mode.Page)).toContain(`GENERATING_${mode.name}`);
  });

  it('renders ready generated content to a logged-out visitor', async () => {
    state.generated = { status: 'ready', content: mode.ready };

    expect(await html(mode.Page)).toContain(mode.readyMarker);
  });

  it.each([null, { status: 'error', content: null }])(
    'hides the owner-only generate flow from visitors when content is %j',
    async (generated) => {
      state.generated = generated;

      await expect(mode.Page({ params })).rejects.toMatchObject(NOT_FOUND);
    },
  );

  it('does not treat a signed-in non-owner as the owner', async () => {
    state.session = { user: { id: 'someone-else' } };

    await expect(mode.Page({ params })).rejects.toMatchObject(NOT_FOUND);
  });

  it('lets the owner reach the generate flow when nothing is ready', async () => {
    state.session = { user: { id: 'owner-1' } };

    expect(await html(mode.Page)).toContain(mode.generateMarker);
  });
});

describe('encyclopedia content shape', () => {
  it('404s on ready content that fails normalization', async () => {
    state.generated = { status: 'ready', content: { markdown: 42 } };

    await expect(EncyclopediaPage({ params })).rejects.toMatchObject(NOT_FOUND);
  });
});

describe('session lookup failure', () => {
  it('fails safe to the visitor view instead of leaking the owner flow', async () => {
    state.session = Promise.reject(new Error('auth store down'));

    await expect(EncyclopediaPage({ params })).rejects.toMatchObject(NOT_FOUND);
  });
});
