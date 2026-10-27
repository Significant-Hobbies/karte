import { withPublicDocumentHints } from './public-document-hints.mjs';
import {
  htmlPathFromMarkdown,
  parsePublicHtmlPath,
} from './public-route-contract.mjs';
import { wantsMarkdown } from './src/lib/agent-surfaces/http.mjs';
// Worker entry for agent routes, generated Astro assets, and OpenNext.
// Next.js documents retain the framework's cache and session behavior. Only
// generated Astro paths use the custom document-cache fallback below.

import openNext, {
  BucketCachePurge as OpenNextBucketCachePurge,
  DOQueueHandler as OpenNextDOQueueHandler,
  DOShardedTagCache as OpenNextDOShardedTagCache,
} from './.open-next/worker.js';
import { handleAgentEdge, withApiJsonNotFound } from './agent-edge.mjs';
import { handlePublicRouteMarkdown } from './public-route-markdown.mjs';
import { RateLimiterDO as RateLimiterDurableObject } from './rate-limiter-do.mjs';
import { withTiming } from './timing.mjs';
import {
  addProfileCacheHeaders,
  CACHE_CONTROL,
  hasAuthCookie,
  routeBeforeOpenNext,
} from './worker-routing.mjs';

// Durable Objects must be re-exported from the entry that wrangler.toml
// points at, otherwise the bindings can't resolve them at deploy time.
export class BucketCachePurge extends OpenNextBucketCachePurge {}
export class DOQueueHandler extends OpenNextDOQueueHandler {}
export class DOShardedTagCache extends OpenNextDOShardedTagCache {}
// Durable sliding-window rate limiter backing src/lib/rate-limit.ts. Export a
// concrete class here so workerd can detect it from the configured entrypoint.
export class RateLimiterDO extends RateLimiterDurableObject {}

// Only generated Astro assets use this wrapper's document cache. Next.js
// documents must retain OpenNext's cache policy: a URL-only edge entry can
// outlive a release and point at deleted chunks, or skip session-aware logic.
const ASTRO_ASSET_PATHS = new Set([
  '/',
  '/ai-link-in-bio',
  '/articles',
  '/changelog',
  '/faq',
]);
// Generated Astro article pages overlay as articles/<slug>.html; cover the
// whole section so the Next catch-all never sees it as a profile slug.
function isCacheableDocumentPath(pathname) {
  return ASTRO_ASSET_PATHS.has(pathname) || pathname.startsWith('/articles/');
}
async function fetchPublic(request, env, ctx, documentContext) {
  try {
    if (
      isSourceDocument(new URL(request.url).pathname) &&
      ['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    ) {
      if (request.method === 'OPTIONS')
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Accept',
          },
        });
      const sourceUrl = new URL('/api/ai/discovery', request.url);
      sourceUrl.searchParams.set('path', new URL(request.url).pathname);
      const response = await openNext.fetch(new Request(sourceUrl), env, ctx);
      return request.method === 'HEAD'
        ? new Response(null, response)
        : response;
    }

    const path = new URL(request.url).pathname;
    if (
      path === '/index.md' ||
      path === '/api/md' ||
      path.startsWith('/api/md/')
    ) {
      const direct = await handlePublicRouteMarkdown(request, (sourcePath) =>
        loadPublicMarkdown(request, env, ctx, sourcePath),
      );
      if (direct) return direct;
    }
    // The legacy generator still owns skills, OpenAPI and robots. Suppress its
    // summary negotiation so public documents always reach the source loader.
    const legacyHeaders = new Headers(request.headers);
    legacyHeaders.set('Accept', 'text/html');
    const agent = ['GET', 'HEAD'].includes(request.method)
      ? handleAgentEdge(new Request(request, { headers: legacyHeaders }))
      : null;
    if (agent)
      return request.method === 'HEAD' ? new Response(null, agent) : agent;
    const requestedPath = new URL(request.url).pathname;
    if (
      !requestedPath.startsWith('/api/') &&
      (requestedPath.endsWith('.md') || wantsMarkdown(request)) &&
      !parsePublicHtmlPath(htmlPathFromMarkdown(requestedPath))
    ) {
      const denied = await handlePublicRouteMarkdown(request, async () => null);
      if (denied) return denied;
    }
    const routed = await routeBeforeOpenNext(request, env);
    if (routed.response) return routed.response;
    request = routed.request ?? request;
    documentContext.request = request;

    const markdown = await handlePublicRouteMarkdown(request, (sourcePath) =>
      loadPublicMarkdown(request, env, ctx, sourcePath),
    );
    if (markdown) return markdown;

    // `withApiJsonNotFound` is applied on the way back out: Next.js owns the
    // route table, so only its 404 (never an edge guess) turns into a JSON
    // error body for `/api/*`. These two branches are the only ones an
    // `/api/*` request can reach — API paths are never cacheable documents.
    if (!['GET', 'HEAD'].includes(request.method)) {
      return withApiJsonNotFound(
        request,
        await openNext.fetch(request, env, ctx),
      );
    }
    const url = new URL(request.url);
    if (!isCacheableDocumentPath(url.pathname)) {
      const response = withApiJsonNotFound(
        request,
        await openNext.fetch(request, env, ctx),
      );
      return routed.cacheProfile ? addProfileCacheHeaders(response) : response;
    }
    // Preserve the signed-in homepage redirect. FAQ and changelog remain
    // public static documents even when a session cookie is present.
    if (hasAuthCookie(request) && url.pathname === '/') {
      return openNext.fetch(request, env, ctx);
    }

    // Short-circuit: the Astro landing, FAQ, and changelog are overlaid into
    // `.open-next/assets` by `scripts/overlay-astro-landing.mjs`. Serve them
    // straight from the assets binding instead of letting the Next catch-all
    // interpret `/faq` or `/changelog` as profile slugs.
    //
    // Return the asset representation unchanged. Manual precompression here
    // poisoned the shared edge cache: Cloudflare could negotiate another
    // encoding around the already-gzipped body, leaving browsers with gzip
    // bytes after their advertised encoding was decoded.
    if (env.ASSETS && ASTRO_ASSET_PATHS.has(url.pathname)) {
      const assetResp = await env.ASSETS.fetch(request);
      // The assets binding answers If-None-Match revalidations with 304.
      // Pass those through — falling through would hand the request to
      // Next.js, which serves the fallback landing instead of the Astro
      // page browsers already hold in cache.
      if (assetResp.status === 304) {
        const headers = new Headers(assetResp.headers);
        headers.set('Cache-Control', CACHE_CONTROL);
        headers.set('x-edge-cache', 'ASSET');
        return new Response(null, { status: 304, headers });
      }
      if (assetResp.ok && (assetResp.body || request.method === 'HEAD')) {
        const headers = new Headers(assetResp.headers);
        headers.set('Cache-Control', CACHE_CONTROL);
        headers.set('x-edge-cache', 'ASSET');
        return new Response(assetResp.body, {
          status: assetResp.status,
          statusText: assetResp.statusText,
          headers,
        });
      }
    }

    const cache = caches.default;
    if (request.method === 'HEAD') {
      const response = await openNext.fetch(request, env, ctx);
      const headers = new Headers(response.headers);
      if (
        response.status === 200 &&
        headers.get('content-type')?.includes('text/html')
      )
        headers.set('Cache-Control', CACHE_CONTROL);
      return new Response(null, { status: response.status, headers });
    }
    const cached = await cache.match(request);
    if (cached) {
      const hit = new Response(cached.body, cached);
      hit.headers.set('x-edge-cache', 'HIT');
      return hit;
    }

    const response = await openNext.fetch(request, env, ctx);

    // Only cache 2xx HTML responses — never error pages or redirects.
    const contentType = response.headers.get('content-type') ?? '';
    if (response.status !== 200 || !contentType.includes('text/html')) {
      return response;
    }

    // Read the body into memory once so we can hand the same bytes to
    // both the client response and the cache.put. The earlier pattern
    // (`new Response(response.body, response)` then `.clone()`) was
    // silently dropping the inlined critical-CSS chunk somewhere in the
    // stream-fork; reading once and constructing both responses from
    // the same Uint8Array sidesteps the streaming edge case entirely.
    const body = await response.arrayBuffer();
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', CACHE_CONTROL);

    const cacheable = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    ctx.waitUntil(cache.put(request, cacheable.clone()));

    const clientResponse = new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    clientResponse.headers.set('x-edge-cache', 'MISS');
    return clientResponse;
  } catch (err) {
    console.error(
      `[error] ${request.method} ${new URL(request.url).pathname}:`,
      err.message,
      err.stack,
    );
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
function isSourceDocument(path) {
  return [
    '/llms.txt',
    '/llms-full.txt',
    '/ai.txt',
    '/api/md/_catalog',
  ].includes(path);
}
export default {
  fetch: withTiming(async function fetch(request, env, ctx) {
    const documentContext = { request };
    const response = await fetchPublic(request, env, ctx, documentContext);
    return withPublicDocumentHints(documentContext.request, response);
  }),
};

async function loadPublicMarkdown(request, env, ctx, sourcePath) {
  const sourceUrl = new URL('/api/ai/markdown', request.url);
  sourceUrl.searchParams.set('path', sourcePath);
  const sourceResponse = await openNext.fetch(
    new Request(sourceUrl, {
      headers: {
        Accept: 'text/markdown',
        'x-karte-markdown-source': '1',
      },
    }),
    env,
    ctx,
  );
  if (sourceResponse.status === 404) return null;
  if (!sourceResponse.ok) throw new Error('Public Markdown source unavailable');
  const contentType = sourceResponse.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('text/markdown')) return null;
  return sourceResponse.text();
}
