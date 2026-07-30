export const SITE_ORIGIN = 'https://karte.cc';

export const STATIC_PUBLIC_ROUTES = Object.freeze([
  {
    path: '/',
    title: 'Karte — Everyone gets an inbound agent',
    description:
      'Karte turns a personal page into a public inbound agent that answers visitor questions, collects context, and sends cleaner messages to your inbox.',
    changeFrequency: 'weekly',
    priority: 1,
    owner: 'astro',
    markdown: [
      'Karte gives a person or AI agent one public page for links, projects, proof, and contextual inbound conversations.',
      'Visitors can ask the profile questions, send a message with context, or inspect public work without needing an account.',
      'Creators manage their public page, profile memory, inbox, and generated encyclopedia, newspaper, or roast modes from a private dashboard.',
    ],
  },
  {
    path: '/about',
    title: 'About Karte — Public inbound assistant',
    description:
      'Learn how Karte combines a public profile, contextual visitor chat, generated profile modes, and creator-owned inbound follow-up.',
    changeFrequency: 'monthly',
    priority: 0.7,
    owner: 'next',
    markdown: [
      'Karte is a link-in-bio profile that can answer questions from the public information its owner chooses to publish.',
      'Public profiles can include links, projects, timelines, contact paths, and optional encyclopedia, newspaper, and roast modes.',
      'Private editing, inbox, lead, analytics, and configuration surfaces require the profile owner to sign in.',
    ],
  },
  {
    path: '/create',
    title: 'Create your public inbound agent — Karte',
    description:
      'Draft a Karte profile, choose a public username, add your links and bio, and sign in only when you are ready to claim and publish it.',
    changeFrequency: 'monthly',
    priority: 0.8,
    owner: 'next',
    markdown: [
      'Draft a public Karte profile before signing in.',
      'Choose a username, write a bio, import links, select a theme, and shape the page. A Google account is required only when you save and claim it.',
      'Published profiles can later enable contextual chat, contact collection, project cards, timelines, and generated profile modes.',
    ],
  },
  {
    path: '/faq',
    title: 'Karte FAQ — Agent profiles and trust cards',
    description:
      'Answers about Karte agent profiles, public trust cards, agent.json manifests, contextual chat, and AI-enhanced profile modes.',
    changeFrequency: 'monthly',
    priority: 0.8,
    owner: 'astro',
    markdown: [
      'Karte supports public profiles for both people and AI agents. Human visitors see a styled profile; machines can inspect agent-native discovery surfaces and public manifests.',
      'An agent-type profile can declare its purpose, operator, capabilities, disclosure policy, and chat endpoint. Published agent profiles expose a machine-readable manifest at `/{slug}/agent.json`.',
      'Karte also supports contextual visitor chat and optional encyclopedia, newspaper, and roast modes generated from the public profile source.',
    ],
  },
  {
    path: '/changelog',
    title: 'Changelog — Karte',
    description:
      'Meaningful improvements to Karte public profiles, inbound assistant behavior, creator follow-up, reliability, and privacy.',
    changeFrequency: 'monthly',
    priority: 0.6,
    owner: 'astro',
    markdown: [
      'Karte maintains an owned product changelog covering verified, user-visible outcomes.',
      'Recent work improved public-profile answer reliability, managed Knowledgebase recall, contextual visitor handoff, and the approval-first Creator Opportunity Desk.',
      'Open future work remains in the Karte GitHub Issues tracker.',
    ],
  },
  {
    path: '/privacy',
    title: 'Privacy and data handling — Karte',
    description:
      'Read what Karte stores, which providers process profile or visitor data, how public profiles work, and how owners can remove their data.',
    changeFrequency: 'yearly',
    priority: 0.3,
    owner: 'next',
    markdown: [
      'Karte stores account identity, owner-provided profile content, uploaded images, enabled generated modes, and the visitor conversations or analytics described on the privacy page.',
      'Published profile content is public. Dashboard data and private profile editing remain restricted to the owner.',
      'Karte does not sell personal data or serve third-party advertising. Profile owners can remove their stored profile content.',
    ],
  },
  {
    path: '/terms',
    title: 'Terms of use for Karte profiles',
    description:
      'Read the terms for publishing profile content, acceptable use, ownership, profile removal, and the limits of AI-generated responses.',
    changeFrequency: 'yearly',
    priority: 0.3,
    owner: 'next',
    markdown: [
      'Profile owners retain ownership of the content they publish and grant Karte the rights needed to display it and power enabled profile features.',
      'Illegal content, targeted harassment, and impersonation are not allowed.',
      'Karte and its AI-generated responses are provided as-is and may be inaccurate.',
    ],
  },
]);

export const PROFILE_MODES = Object.freeze([
  {
    segment: 'encyclopedia',
    enabledField: 'encyclopediaEnabled',
    label: 'Encyclopedia',
    changeFrequency: 'weekly',
    priority: 0.55,
  },
  {
    segment: 'newspaper',
    enabledField: 'newspaperEnabled',
    label: 'Newspaper',
    changeFrequency: 'weekly',
    priority: 0.5,
  },
  {
    segment: 'roast',
    enabledField: 'roastEnabled',
    label: 'Roast',
    changeFrequency: 'weekly',
    priority: 0.5,
  },
]);

export const ROBOTS_ALLOW = Object.freeze([
  '/',
  '/api/ai',
  '/api/v1/agents',
  '/llms.txt',
  '/llms-full.txt',
  '/index.md',
  '/skill.md',
  '/.well-known/skills/',
]);

export const ROBOTS_DISALLOW = Object.freeze([
  '/dashboard',
  '/login',
  '/welcome',
  '/api/',
]);

const STATIC_BY_PATH = new Map(
  STATIC_PUBLIC_ROUTES.map((route) => [route.path, route]),
);
const PROFILE_MODE_BY_SEGMENT = new Map(
  PROFILE_MODES.map((mode) => [mode.segment, mode]),
);

const RESERVED_FIRST_SEGMENTS = new Set([
  '.well-known',
  '_next',
  'api',
  'dashboard',
  'login',
  'welcome',
  'skill.md',
  'llms.txt',
  'llms-full.txt',
  'index.md',
  'humans.txt',
  'robots.txt',
  'sitemap.xml',
  'manifest.webmanifest',
  'opengraph-image',
  'favicon.ico',
  'favicon.svg',
  'icon.svg',
  'apple-touch-icon.png',
]);

export function staticPublicRoute(pathname) {
  return STATIC_BY_PATH.get(normalizePath(pathname)) ?? null;
}

export function buildPublicProfilePaths(profile, readyTypes = new Set()) {
  if (!profile?.slug || profile.published === false) return [];
  const paths = [`/${profile.slug}`];
  for (const mode of PROFILE_MODES) {
    if (profile[mode.enabledField] && readyTypes.has(mode.segment)) {
      paths.push(`/${profile.slug}/${mode.segment}`);
    }
  }
  return paths;
}

export function parsePublicHtmlPath(pathname) {
  const path = normalizePath(pathname);
  const staticRoute = staticPublicRoute(path);
  if (staticRoute) return { kind: 'static', path, route: staticRoute };

  const segments = path.split('/').filter(Boolean);
  if (segments.length < 1 || segments.length > 2) return null;
  const [slug, modeSegment] = segments;
  if (
    !slug ||
    RESERVED_FIRST_SEGMENTS.has(slug) ||
    slug.includes('.') ||
    !/^[a-z0-9-]+$/i.test(slug)
  ) {
    return null;
  }
  if (!modeSegment) return { kind: 'profile', path, slug };
  const mode = PROFILE_MODE_BY_SEGMENT.get(modeSegment);
  return mode ? { kind: 'mode', path, slug, mode } : null;
}

export function markdownPathFor(pathname) {
  const path = normalizePath(pathname);
  return path === '/' ? '/index.md' : `${path}.md`;
}

export function htmlPathFromMarkdown(pathname) {
  const path = normalizePath(pathname);
  if (path === '/index.md') return '/';
  if (!path.endsWith('.md')) return path;
  return normalizePath(path.slice(0, -3));
}

export function robotsTextFor(origin = SITE_ORIGIN) {
  return [
    'User-agent: *',
    ...ROBOTS_ALLOW.map((path) => `Allow: ${path}`),
    ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  const leading = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return leading.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
}
