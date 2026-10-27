import { parsePublicHtmlPath, SITE_ORIGIN } from './public-route-contract.mjs';
import { discoveryLinkHeader } from './src/lib/agent-surfaces/handler.mjs';
import { markdownPathFor } from './src/lib/agent-surfaces/http.mjs';
export function withPublicDocumentHints(request, response) {
  const path = new URL(request.url).pathname;
  if (
    response.status !== 200 ||
    !response.headers.get('content-type')?.includes('text/html') ||
    !parsePublicHtmlPath(path)
  )
    return response;
  const headers = new Headers(response.headers);
  const vary = new Set(
    (headers.get('Vary') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  vary.add('Accept');
  headers.set('Vary', [...vary].join(', '));
  headers.append(
    'Link',
    `<${SITE_ORIGIN}${markdownPathFor(path)}>; rel="alternate"; type="text/markdown", ${discoveryLinkHeader(SITE_ORIGIN)}`,
  );
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    headers,
  });
}
