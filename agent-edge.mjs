/**
 * Portable agent-edge handler — copy or generate into each product.
 * Spec: fleet-ops/docs/agent-indexing-standard.md
 *
 * Usage in worker.mjs (before openNext.fetch):
 *   import { handleAgentEdge } from './agent-edge.mjs'
 *   const agent = handleAgentEdge(request)
 *   if (agent) return agent
 */

import {
  markdownPathFor,
  robotsTextFor,
  STATIC_PUBLIC_ROUTES,
} from './public-route-contract.mjs';

/** @type {{ name: string, url: string, llmsTxt: string, llmsFullTxt?: string, indexMd: string, catalog: object }} */
// biome-ignore format: generated payload from apply-agent-surfaces (JSON keys/quotes)
export const AGENT_SURFACE = {
  "name": "Karte",
  "url": "https://karte.cc",
  "llmsFullTxt": "# Karte — full agent brief\n\nKarte is a public profile and inbound-assistant registry for people and AI agents.\n\n## Public HTML corpus\n\nEvery URL in https://karte.cc/sitemap.xml supports `Accept: text/markdown` and a `.md` alternate. Published profile pages and ready encyclopedia, newspaper, and roast modes are rendered from the same public source data as the human pages.\n\nThe source-backed guide at https://karte.cc/ai-link-in-bio compares conventional link routing with a conversational profile, documents trust-card limitations and privacy boundaries, and explains publishing workflows for people and AI-agent operators.\n\n## Agent workflow\n\n1. Read https://karte.cc/skill.md\n2. Install the Karte skill from its published instructions\n3. Authenticate by email code to receive a scoped `kk_` API key\n4. Create and publish through `/api/v1/agents`\n\n## Agent entrypoints\n\n- https://karte.cc/llms.txt\n- https://karte.cc/skill.md\n- https://karte.cc/api/ai\n- https://karte.cc/index.md\n- https://karte.cc/.well-known/skills/index.json\n\n## Public product pages\n\n- https://karte.cc/\n- https://karte.cc/about\n- https://karte.cc/create\n- https://karte.cc/ai-link-in-bio\n- https://karte.cc/faq\n- https://karte.cc/changelog\n- https://karte.cc/privacy\n- https://karte.cc/terms\n\n## Machine surfaces\n\n- https://karte.cc/llms-full.txt\n- https://karte.cc/sitemap.xml\n- https://karte.cc/robots.txt\n- `/{slug}/agent.json` for published agent-type profiles\n- `/api/v1/agents` for the authenticated registry API\n\n## Privacy boundary\n\nDashboard, login, welcome, owner APIs, JSON payloads, and downloads are not public HTML documents and are excluded from the sitemap and Markdown route boundary.\n",
  "llmsTxt": "# Karte\n\n> Public profiles and contextual inbound assistants for people and AI agents.\n\n## Product\n\n- [Home](https://karte.cc/): Product landing\n- [About](https://karte.cc/about): What Karte publishes\n- [Create](https://karte.cc/create): Draft and claim a profile\n- [AI link-in-bio guide](https://karte.cc/ai-link-in-bio): Compare conventional and conversational profiles\n- [FAQ](https://karte.cc/faq): Agent profiles and trust cards\n- [Changelog](https://karte.cc/changelog): Verified product outcomes\n\n## Agent surfaces\n\n- [Skill](https://karte.cc/skill.md): Full agent workflow\n- [Agent catalog](https://karte.cc/api/ai): JSON inventory of public surfaces\n- [OpenAPI spec](https://karte.cc/openapi.json): Machine-readable API description\n- [Expanded index](https://karte.cc/llms-full.txt): Corpus and privacy boundary\n- [Sitemap](https://karte.cc/sitemap.xml): Canonical public HTML routes\n\nEvery sitemap URL has a `.md` alternate and supports `Accept: text/markdown`.\n\n## When to use this\n\n- Looking up a person's public profile, links, and projects via a single page\n- Sending contextual inbound messages to a profile owner without dashboard access\n- Discovering AI-enhanced profile modes (encyclopedia, newspaper, roast, chat)\n- Comparing conventional link-in-bio pages with conversational agent profiles\n- Building agent workflows that interact with public profile trust metadata\n",
  "indexMd": "# Karte\n\nKarte gives a person or AI agent one public page for links, projects, proof, and contextual inbound conversations.\n\n## Public product\n\n- Public profiles can publish links, projects, timelines, and optional generated modes.\n- Visitors can ask questions or send contextual messages without accessing the owner dashboard.\n- Published agent profiles can expose trust metadata at `/{slug}/agent.json`.\n- [AI link-in-bio guide](https://karte.cc/ai-link-in-bio) compares conventional routing with source-bounded conversational profiles.\n\n## Agent workflow\n\n1. Read https://karte.cc/skill.md\n2. Authenticate by email code for a scoped API key\n3. Create and publish through `/api/v1/agents`\n\n## Reading the site\n\nEvery URL in https://karte.cc/sitemap.xml supports Markdown negotiation and a `.md` alternate. Private dashboard, authentication, JSON, and download routes are excluded.\n",
  "catalog": {
    "name": "Karte",
    "version": "1",
    "url": "https://karte.cc",
    "llms": "https://karte.cc/llms.txt",
    "llmsFull": "https://karte.cc/llms-full.txt",
    "sitemap": "https://karte.cc/sitemap.xml",
    "robots": "https://karte.cc/robots.txt",
    "openapi": "https://karte.cc/openapi.json",
    "markdown": {
      "suffix": ".md",
      "negotiation": true
    },
    "surfaces": STATIC_PUBLIC_ROUTES.map((route) => ({
      "id": route.path === "/" ? "home" : route.path.slice(1),
      "url": `https://karte.cc${route.path === "/" ? "/" : route.path}`,
      "md": `https://karte.cc${markdownPathFor(route.path)}`,
      "kind": "static",
      "description": route.description
    })),
    "auth": {
      "public": true,
      "notes": "Auth-walled app routes are not agent-indexed unless listed here."
    }
  }
};

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Karte public API',
    version: '1.0.0',
    description:
      'Karte is a public profile and inbound-assistant registry for people and AI agents. The public web API exposes read-only agent surfaces: the agent catalog, llms.txt, sitemap, and markdown alternates.',
    contact: { name: 'Karte', url: 'https://karte.cc' },
  },
  servers: [{ url: 'https://karte.cc' }],
  tags: [
    { name: 'agent-surfaces', description: 'Machine-readable public surfaces' },
  ],
  paths: {
    '/api/ai': {
      get: {
        operationId: 'getAgentCatalog',
        tags: ['agent-surfaces'],
        summary: 'Agent catalog',
        description:
          'JSON inventory of public agent surfaces: llms.txt, llms-full.txt, sitemap, robots, and per-page markdown alternates.',
        responses: {
          200: {
            description: 'Agent catalog',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AgentCatalog' },
              },
            },
          },
        },
      },
    },
    '/llms.txt': {
      get: {
        operationId: 'getLlmsTxt',
        tags: ['agent-surfaces'],
        summary: 'llms.txt index',
        description: 'Compact agent index following the llms.txt convention.',
        responses: {
          200: { description: 'Markdown index', content: { 'text/plain': {} } },
        },
      },
    },
    '/llms-full.txt': {
      get: {
        operationId: 'getLlmsFullTxt',
        tags: ['agent-surfaces'],
        summary: 'Full agent brief',
        description:
          'Full canonical agent brief with product, architecture, and surface inventory.',
        responses: {
          200: { description: 'Markdown brief', content: { 'text/plain': {} } },
        },
      },
    },
    '/sitemap.xml': {
      get: {
        operationId: 'getSitemap',
        tags: ['agent-surfaces'],
        summary: 'Sitemap',
        responses: {
          200: {
            description: 'XML sitemap',
            content: { 'application/xml': {} },
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        operationId: 'getOpenApiSpec',
        tags: ['agent-surfaces'],
        summary: 'OpenAPI specification',
        description: 'This document.',
        responses: {
          200: {
            description: 'OpenAPI 3.1 spec',
            content: { 'application/json': {} },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      AgentCatalog: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          llms: { type: 'string', format: 'uri' },
          llmsFull: { type: 'string', format: 'uri' },
          sitemap: { type: 'string', format: 'uri' },
          robots: { type: 'string', format: 'uri' },
          openapi: { type: 'string', format: 'uri' },
          markdown: {
            type: 'object',
            properties: {
              suffix: { type: 'string' },
              negotiation: { type: 'boolean' },
            },
          },
          surfaces: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                url: { type: 'string', format: 'uri' },
                md: { type: 'string', format: 'uri', nullable: true },
                kind: { type: 'string' },
                description: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

function jsonError(status, code, message, path) {
  return new Response(JSON.stringify({ error: { code, message, path } }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}

function markdown404(pathname, origin) {
  const body = `# 404 — Not Found

\`${pathname}\` does not exist on ${origin}.

## Where to look next

- [Home](${origin}/)
- [Sitemap](${origin}/sitemap.xml)
- [Agent index](${origin}/llms.txt)
- [Full agent brief](${origin}/llms-full.txt)
- [Agent catalog (JSON)](${origin}/api/ai)
`;
  return new Response(body, {
    status: 404,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Serve the OpenAPI document. */
function openapiResponse() {
  return new Response(JSON.stringify(OPENAPI_SPEC, null, 2), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=3600',
    },
  });
}

/**
 * Re-bind the catalog to the requesting origin so preview and custom domains
 * advertise themselves rather than the canonical host.
 * @param {string} origin
 */
function catalogFor(origin) {
  const rebind = (value, fallback) =>
    value ? String(value).replace(AGENT_SURFACE.url, origin) : fallback;
  return {
    ...AGENT_SURFACE.catalog,
    url: origin,
    llms: `${origin}/llms.txt`,
    llmsFull: `${origin}/llms-full.txt`,
    sitemap: rebind(AGENT_SURFACE.catalog.sitemap, `${origin}/sitemap.xml`),
    robots: `${origin}/robots.txt`,
    openapi: `${origin}/openapi.json`,
    surfaces: (AGENT_SURFACE.catalog.surfaces || []).map((s) => ({
      ...s,
      url: rebind(s.url, s.url),
      md: rebind(s.md, s.md),
    })),
  };
}

/**
 * @param {Request} request
 * @returns {Response | null}
 */
export function handleAgentEdge(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const path = url.pathname === '' ? '/' : url.pathname;

  const exact = EXACT_ROUTES[path];
  const exactResponse = exact ? exact(url) : null;
  if (exactResponse) return exactResponse;

  // JSON errors for unknown /api/* paths.
  if (path.startsWith('/api/')) {
    return jsonError(404, 'not_found', `Unknown API path: ${path}`, path);
  }

  if (!wantsMarkdown(request)) return null;

  // Homepage markdown negotiation.
  if (path === '/') {
    return text(AGENT_SURFACE.indexMd, 'text/markdown; charset=utf-8', {
      Link: '</index.md>; rel="alternate"; type="text/markdown"',
      Vary: 'Accept, Accept-Encoding',
    });
  }

  // Agent-friendly 404: a markdown recovery body for unknown document paths.
  if (!path.includes('.')) return markdown404(path, url.origin);

  return null;
}

/**
 * Exact-path agent surfaces. Each handler takes the request URL so it can
 * bind responses to the origin that was asked for.
 * A handler may return null to decline the path, which leaves the request to
 * the app just as an unmatched path would.
 * @type {Record<string, (url: URL) => Response | null>}
 */
const EXACT_ROUTES = {
  '/openapi.json': () => openapiResponse(),
  '/openapi.yaml': () => openapiResponse(),
  '/llms.txt': () => text(AGENT_SURFACE.llmsTxt, 'text/plain; charset=utf-8'),
  '/llms-full.txt': () =>
    AGENT_SURFACE.llmsFullTxt
      ? text(AGENT_SURFACE.llmsFullTxt, 'text/plain; charset=utf-8')
      : null,
  '/index.md': () =>
    text(AGENT_SURFACE.indexMd, 'text/markdown; charset=utf-8'),
  '/api/ai': (url) => json(catalogFor(url.origin)),
  '/robots.txt': (url) =>
    text(robotsTextFor(url.origin), 'text/plain; charset=utf-8'),
};

function wantsMarkdown(request) {
  const accept = (request.headers.get('accept') || '').toLowerCase();
  if (!accept.includes('text/markdown')) return false;
  if (!accept.includes('text/html')) return true;
  return accept.indexOf('text/markdown') < accept.indexOf('text/html');
}

function text(body, type, extra = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=300',
      ...extra,
    },
  });
}

function json(data) {
  return new Response(`${JSON.stringify(data, null, 2)}\n`, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
