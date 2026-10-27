import {
  htmlPathFromMarkdown,
  parsePublicHtmlPath,
  SITE_ORIGIN,
} from './public-route-contract.mjs';
import {
  wantsMarkdown as acceptsMarkdown,
  markdownResponse,
} from './src/lib/agent-surfaces/http.mjs';

const FIXED_AGENT_PATHS = new Set([
  '/api/ai',
  '/ai.txt',
  '/api/md/_catalog',
  '/llms-full.txt',
  '/llms.txt',
  '/skill.md',
]);

export async function handlePublicRouteMarkdown(request, loadMarkdown) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return null;

  const requestedUrl = new URL(request.url);
  if (FIXED_AGENT_PATHS.has(requestedUrl.pathname)) return null;

  const { explicitMarkdown, sourcePath, parsed } = markdownTarget(
    requestedUrl.pathname,
  );
  if (!explicitMarkdown && requestedUrl.pathname.startsWith('/api/'))
    return null;

  if (explicitMarkdown && !parsed) {
    return markdownError(
      404,
      'Not found',
      requestedUrl.pathname,
      request.method,
    );
  }
  if (!explicitMarkdown && !wantsMarkdown(request)) return null;
  if (!parsed)
    return markdownError(404, 'Not found', sourcePath, request.method);

  const markdown = await loadMarkdown(sourcePath, request);
  if (!markdown) {
    return markdownError(
      404,
      'Public document unavailable',
      sourcePath,
      request.method,
    );
  }

  if (request.method === 'OPTIONS')
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Accept',
        'Access-Control-Max-Age': '86400',
      },
    });
  const canonical = new URL(parsed.path, SITE_ORIGIN).href;
  return markdownResponse(markdown, request, {
    'Cache-Control':
      parsed.kind === 'profile' || parsed.kind === 'mode'
        ? 'private, no-store'
        : 'public, max-age=300, s-maxage=3600',
    'Content-Location': canonical,
    Link: `<${canonical}>; rel="canonical"; type="text/html"`,
    ...(!explicitMarkdown
      ? {
          'CDN-Cache-Control': 'no-store',
          'Cloudflare-CDN-Cache-Control': 'no-store',
        }
      : {}),
  });
}

function wantsMarkdown(request) {
  return (
    request.headers.get('x-karte-markdown-source') !== '1' &&
    acceptsMarkdown(request)
  );
}

function markdownError(status, title, path, method) {
  const body = `# ${title}\n\nNo public Markdown document is available for \`${path}\`.\n`;
  return new Response(method === 'HEAD' ? null : body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, follow',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function markdownTarget(path) {
  const direct = path === '/api/md' || path.startsWith('/api/md/');
  const explicitMarkdown = direct || path.endsWith('.md');
  const sourcePath = direct
    ? `/${path.replace(/^\/api\/md\/?/, '')}`
    : explicitMarkdown
      ? htmlPathFromMarkdown(path)
      : path;
  const parsed = parsePublicHtmlPath(sourcePath);
  return { explicitMarkdown, sourcePath, parsed };
}
