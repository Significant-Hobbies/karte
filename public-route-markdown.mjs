import {
  htmlPathFromMarkdown,
  markdownPathFor,
  parsePublicHtmlPath,
} from './public-route-contract.mjs';

const FIXED_AGENT_PATHS = new Set([
  '/api/ai',
  '/index.md',
  '/llms-full.txt',
  '/llms.txt',
  '/skill.md',
]);

export async function handlePublicRouteMarkdown(request, loadMarkdown) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;

  const requestedUrl = new URL(request.url);
  if (FIXED_AGENT_PATHS.has(requestedUrl.pathname)) return null;

  const explicitMarkdown = requestedUrl.pathname.endsWith('.md');
  const sourcePath = explicitMarkdown
    ? htmlPathFromMarkdown(requestedUrl.pathname)
    : requestedUrl.pathname;
  const parsed = parsePublicHtmlPath(sourcePath);

  if (explicitMarkdown && !parsed) {
    return markdownError(
      404,
      'Not found',
      requestedUrl.pathname,
      request.method,
    );
  }
  if (!explicitMarkdown && (!wantsMarkdown(request) || !parsed)) return null;

  const markdown = await loadMarkdown(sourcePath, request);
  if (!markdown) {
    return markdownError(
      404,
      'Public document unavailable',
      sourcePath,
      request.method,
    );
  }

  return new Response(request.method === 'HEAD' ? null : markdown, {
    status: 200,
    headers: {
      'Cache-Control':
        'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
      'Content-Location': markdownPathFor(sourcePath),
      'Content-Type': 'text/markdown; charset=utf-8',
      Link: `<${sourcePath}>; rel="canonical"; type="text/html"`,
      Vary: 'Accept',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function wantsMarkdown(request) {
  const accept = (request.headers.get('accept') || '').toLowerCase();
  if (!accept.includes('text/markdown')) return false;
  if (!accept.includes('text/html')) return true;
  return accept.indexOf('text/markdown') < accept.indexOf('text/html');
}

function markdownError(status, title, path, method) {
  const body = `# ${title}\n\nNo public Markdown document is available for \`${path}\`.\n`;
  return new Response(method === 'HEAD' ? null : body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
