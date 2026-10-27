import sitemap from '@/app/sitemap';
import { createAgentSurfaceHandler } from '@/lib/agent-surfaces/handler.mjs';
import { renderPublicRouteMarkdown } from '@/lib/public-route-markdown';
import { AGENT_SURFACE } from '../../../../../agent-edge.mjs';
import { ARTICLES } from '../../../../../content-pages/articles.mjs';
import {
  parsePublicHtmlPath,
  SITE_ORIGIN,
  STATIC_PUBLIC_ROUTES,
} from '../../../../../public-route-contract.mjs';

export const dynamic = 'force-dynamic';
const documents = new Set([
  '/llms.txt',
  '/llms-full.txt',
  '/ai.txt',
  '/api/md/_catalog',
]);
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path') ?? '';
  if (!documents.has(path)) return new Response('Not found', { status: 404 });
  const staticRoutes = new Map(
    STATIC_PUBLIC_ROUTES.map((route) => [route.path, route]),
  );
  const articleRoutes = new Map(
    ARTICLES.map((article) => [`/articles/${article.slug}`, article]),
  );
  const routes = (await sitemap())
    .filter((entry) => parsePublicHtmlPath(new URL(entry.url).pathname))
    .map((entry) => {
      const path = new URL(entry.url).pathname;
      const source = staticRoutes.get(path) ?? articleRoutes.get(path);
      return {
        path,
        title: source?.title ?? path.slice(1).replaceAll('/', ' — '),
        description:
          source?.description ?? 'Owner-published Karte profile content',
        kind: source ? 'static' : 'profile',
        lastModified: entry.lastModified,
      };
    });
  // A request-local registry: withdrawn profiles must never linger in discovery.
  const handle = createAgentSurfaceHandler({
    manifest: {
      name: 'Karte',
      origin: SITE_ORIGIN,
      summary: STATIC_PUBLIC_ROUTES[0].description,
      pages: {},
      notes: [
        guidanceSection(AGENT_SURFACE.llmsTxt, '## When to use this'),
        guidanceSection(
          AGENT_SURFACE.llmsFullTxt,
          '## Agent profile workflow',
          '## Public product pages',
        ),
        guidanceSection(
          AGENT_SURFACE.llmsFullTxt,
          '## Privacy and authority boundary',
        ),
      ],
      catalog: AGENT_SURFACE.catalog,
      negotiation: true,
      trainingAllowed: true,
      openapi: `${SITE_ORIGIN}/openapi.json`,
      excludedPaths: [
        '/dashboard',
        '/login',
        '/welcome',
        '/api',
        'unpublished profiles',
        'disabled or unready modes',
        'browser drafts and visitor messages',
      ],
    },
    // These exact routes came from currently published profile records, not
    // administrative endpoints. Preserve existing valid owner slugs.
    publicReservedPaths: routes
      .filter((route) => /^\/(?:admin|auth)(?:\/|$)/.test(route.path))
      .map((route) => route.path),
    listMarkdownRoutes: () => routes,
    loadMarkdown: (path: string) => renderPublicRouteMarkdown(path),
  });
  const response = await handle(new Request(new URL(path, SITE_ORIGIN)));
  if (!response) return new Response('Not found', { status: 404 });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function guidanceSection(
  source: string | undefined,
  heading: string,
  next?: string,
): string {
  const start = source?.indexOf(heading) ?? -1;
  if (!source || start < 0)
    throw new Error(`Missing public guidance: ${heading}`);
  const end = next
    ? source.indexOf(next, start + heading.length)
    : source.length;
  if (end < 0) throw new Error(`Missing public guidance boundary: ${next}`);
  return source.slice(start, end).trim();
}
