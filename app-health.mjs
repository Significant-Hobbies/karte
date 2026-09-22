// App-Health endpoint telemetry: per-route method/status/duration shipped to
// the ingest collector. Dependency-free — the ingest wire format is a single
// POST. Silent no-op until APP_HEALTH_INGEST_KEY is set (secret, not vars: a
// same-name vars entry replaces the secret on deploy). Telemetry can never
// fail a request. Paths collapse to route templates — raw slugs never leave
// the worker.

const INGEST_ENDPOINT = 'https://ingest.sassmaker.com/v1/ingest';

// Karte's primary surface is /<slug>[/newspaper|/roast|/encyclopedia] — the
// first path segment is dynamic. Known static roots pass through verbatim.
const STATIC_ROOTS = new Set([
  'api',
  '_next',
  'assets',
  'static',
  'about',
  'privacy',
  'terms',
  'login',
  'health',
  'changelog',
  'contact',
  'pricing',
  'methodology',
  'developers',
  'llms.txt',
  'llms-full.txt',
  'index.md',
  'sitemap.xml',
  'robots.txt',
  'humans.txt',
  'manifest.webmanifest',
  'favicon.ico',
  'opengraph-image',
]);

function routeFor(pathname) {
  const p = pathname.replace(/\/+$/, '') || '/';
  const segments = p.split('/').filter(Boolean);
  if (segments.length === 0) return '/';
  const first = segments[0];
  if (STATIC_ROOTS.has(first)) {
    if (first === 'api') return p.length <= 64 ? p : null;
    return p.length <= 48 ? p : null;
  }
  const suffix = segments.slice(1).join('/');
  if (['newspaper', 'roast', 'encyclopedia'].includes(suffix))
    return `/:slug/${suffix}`;
  if (suffix === '') return '/:slug';
  return null;
}

export function observeRequest(request, response, durationMs, env, ctx) {
  const key =
    typeof env?.APP_HEALTH_INGEST_KEY === 'string'
      ? env.APP_HEALTH_INGEST_KEY.trim()
      : '';
  const route = routeFor(new URL(request.url).pathname);
  if (!key || !route) return;
  const batch = {
    batch_id: crypto.randomUUID(),
    schema_version: 'v1',
    runtime: 'worker',
    environment: 'production',
    events: [
      {
        event_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        method: request.method,
        route,
        status_code: response.status,
        duration_ms: Math.max(0, Math.round(durationMs)),
      },
    ],
  };
  try {
    ctx.waitUntil(
      fetch(INGEST_ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(batch),
      }).catch(() => undefined),
    );
  } catch {
    // Telemetry must never take down the request path.
  }
}
