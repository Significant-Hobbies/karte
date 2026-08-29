/**
 * Portable agent-edge handler — copy or generate into each product.
 * Spec: fleet-ops/docs/agent-indexing-standard.md
 *
 * The edge is a *strict pre-handler*: it answers only for the surfaces it
 * genuinely owns and returns `null` for everything else. It must never decide
 * that a path does not exist — only Next.js knows the route table.
 *
 * Usage in worker.mjs:
 *   import { handleAgentEdge, withApiJsonNotFound } from './agent-edge.mjs'
 *   const agent = handleAgentEdge(request)
 *   if (agent) return agent
 *   // ...and on the way back out, so unknown /api/* paths answer in JSON:
 *   return withApiJsonNotFound(request, await openNext.fetch(request, env, ctx))
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
  "llmsFullTxt": "# Karte — full product and agent brief\n\nKarte is a creator-owned public profile and contextual inbound assistant for creators and independent operators. A published page keeps links, projects, timeline, public context, visitor questions, contact routes, and owner follow-up in one place.\n\n## Current product truth\n\n- Visitors can browse a published profile, ask a profile-grounded question, or send contact context without an account.\n- Profile owners use Google sign-in to claim and manage a page.\n- Karte has no billing in the current product and is free today; permanent free access is not promised.\n- Person and agent profiles ship today. Company ownership, team roles, approval, and a repeated company workflow remain unvalidated.\n- Optional encyclopedia, newspaper, and roast modes reuse owner-supplied public profile content.\n- Profile-grounded chat uses Karte's product AI gateway, can use an owner-configured provider key, and retains bounded fallbacks.\n\n## Public HTML corpus\n\nEvery URL in https://karte.cc/sitemap.xml supports `Accept: text/markdown` and a `.md` alternate. Published profile pages and ready profile modes are rendered from the same public source data as their human pages.\n\nThe source-backed guide at https://karte.cc/ai-link-in-bio compares conventional link routing with a conversational profile, including trust-card limitations, privacy boundaries, and publishing workflows.\n\n## Agent profile workflow\n\n1. Read https://karte.cc/skill.md\n2. Install the Karte skill from its published instructions\n3. Authenticate by email code to receive a scoped `kk_` API key\n4. Create and publish an agent-type profile through `/api/v1/agents`\n\n## Public product pages\n\n- https://karte.cc/\n- https://karte.cc/about\n- https://karte.cc/create\n- https://karte.cc/ai-link-in-bio\n- https://karte.cc/faq\n- https://karte.cc/changelog\n- https://karte.cc/privacy\n- https://karte.cc/terms\n\n## Machine surfaces\n\n- https://karte.cc/llms.txt\n- https://karte.cc/llms-full.txt\n- https://karte.cc/api/ai\n- https://karte.cc/openapi.json\n- https://karte.cc/index.md\n- https://karte.cc/sitemap.xml\n- https://karte.cc/robots.txt\n- `/{slug}/agent.json` for published agent-type profiles\n- `/api/v1/agents` for the authenticated agent-profile API\n\n## Privacy and authority boundary\n\nPublic profile content is owner-published. Dashboard, login, welcome, owner APIs, non-public JSON payloads, and downloads are not public HTML documents. Karte should not be treated as private knowledge about a profile owner or as authorization to act for them.\n",
  "llmsTxt": "# Karte\n\n> Creator-owned public profiles that answer visitor questions and preserve context for better inbound.\n\n## Product\n\n- [Home](https://karte.cc/): Purpose, visitor journey, shipped capabilities, access, and company boundary\n- [About](https://karte.cc/about): What Karte publishes and keeps private\n- [Create](https://karte.cc/create): Draft and claim a profile\n- [AI link-in-bio guide](https://karte.cc/ai-link-in-bio): Compare conventional and conversational profiles\n- [FAQ](https://karte.cc/faq): Profiles, inbound, access, current cost, agent pages, and company scope\n- [Changelog](https://karte.cc/changelog): Verified product outcomes\n\n## Current state\n\n- Visitors need no account; owners use Google sign-in.\n- There is no billing in the current product. Karte is free today without a permanent-free promise.\n- Person and agent profiles ship today; company and team workflows remain the next validation.\n\n## Agent surfaces\n\n- [Skill](https://karte.cc/skill.md): Agent-profile publishing workflow\n- [Agent catalog](https://karte.cc/api/ai): JSON inventory of public surfaces\n- [OpenAPI spec](https://karte.cc/openapi.json): Machine-readable public-surface description\n- [Expanded brief](https://karte.cc/llms-full.txt): Product, corpus, access, and privacy boundaries\n- [Sitemap](https://karte.cc/sitemap.xml): Canonical public HTML routes\n\nEvery sitemap URL has a `.md` alternate and supports `Accept: text/markdown`.\n\n## When to use this\n\n- Understanding a creator or independent operator through one public profile\n- Asking a question grounded in owner-published profile context\n- Sending a contextual message without accessing the owner dashboard\n- Inspecting published agent-profile trust metadata or machine manifests\n\n## Do not use this for\n\n- Private facts about a profile owner\n- Assuming Karte can act or commit on the owner's behalf\n- Company or team workflows that the current product has not shipped\n",
  "indexMd": "---\ntitle: Karte — A public profile that answers back\ndescription: Creator-owned public profiles for links, projects, visitor questions, and better-contextualized inbound.\ncanonical: https://karte.cc/\nlast_updated: 2026-08-28\n---\n\n# A public card that answers back\n\nKarte gives creators and independent operators one public profile for their work, public context, visitor questions, and better inbound. Visitors understand who someone is before asking for their time.\n\n## What ships today\n\n- Public links, projects, timeline entries, writing, proof, contact routes, and custom domains\n- Profile-grounded visitor chat with bounded fallbacks\n- Contact, page email, inbox, leads, analytics, and an owner dashboard\n- Optional encyclopedia, newspaper, and roast views generated from owner-supplied profile content\n- Agent-type profiles with operator, capability, disclosure, and machine-readable manifest data\n\n## Access and cost\n\nVisitors browse and ask questions without an account. Profile owners use Google sign-in to claim and manage a page. Karte has no billing in the current product and is free today, but the long-term commercial model is not committed.\n\n## Company boundary\n\nPerson and agent profiles ship today. Karte does not yet ship company ownership, team roles, approval, or a validated repeated-company workflow. Company-friendly use remains the next product test.\n\n## Public evidence and next action\n\n- [Open the live owner profile](https://karte.cc/sarthak)\n- [Create a profile](https://karte.cc/create)\n- [Read the profile comparison](https://karte.cc/ai-link-in-bio)\n- [Read current product boundaries](https://karte.cc/faq)\n\nEvery URL in https://karte.cc/sitemap.xml supports Markdown negotiation and a `.md` alternate. Private dashboard and authentication routes are excluded from the public document corpus.\n",
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

const AGENT_MUTABLE_PROPERTIES = {
  displayName: { type: 'string', minLength: 1, maxLength: 120 },
  agentPurpose: { type: 'string', maxLength: 500 },
  agentOperator: { type: 'string', maxLength: 100 },
  agentOperatorUrl: { type: 'string', format: 'uri' },
  agentCapabilities: {
    type: 'array',
    items: { type: 'string' },
  },
  agentDisclosurePolicy: { type: 'string', maxLength: 1000 },
  avatarUrl: { type: 'string', format: 'uri' },
  brainEndpointUrl: { type: 'string', format: 'uri' },
  brainEndpointAuth: { type: 'string', writeOnly: true },
};

const OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Karte public API',
    version: '1.0.0',
    description:
      'Karte is a creator-owned public profile and contextual inbound assistant. The public web API describes read-only discovery surfaces, Markdown alternates, and the separate agent-profile publishing workflow.',
    contact: { name: 'Karte', url: 'https://karte.cc' },
    'x-versioning-policy':
      'Authenticated agent-profile operations use the stable /api/v1 path. Breaking changes will use a new major path; additive response fields may appear within v1.',
  },
  servers: [{ url: 'https://karte.cc' }],
  tags: [
    { name: 'agent-surfaces', description: 'Machine-readable public surfaces' },
    {
      name: 'agent-profiles',
      description:
        'Versioned agent-profile publishing operations authenticated with a Karte API key',
    },
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
          200: {
            description: 'Markdown index',
            content: {
              'text/plain': { schema: { type: 'string' } },
            },
          },
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
          200: {
            description: 'Markdown brief',
            content: {
              'text/plain': { schema: { type: 'string' } },
            },
          },
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
            content: {
              'application/xml': { schema: { type: 'string' } },
            },
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
            content: {
              'application/json': {
                schema: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
    },
    '/api/v1/agents': {
      get: {
        operationId: 'listOwnedAgentProfiles',
        tags: ['agent-profiles'],
        summary: 'List owned agent profiles',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Owned agent profiles',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AgentListResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        operationId: 'createAgentProfile',
        tags: ['agent-profiles'],
        summary: 'Create an unpublished agent profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AgentCreateInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Agent profile created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AgentResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/v1/agents/{slug}': {
      parameters: [{ $ref: '#/components/parameters/AgentSlug' }],
      get: {
        operationId: 'getOwnedAgentProfile',
        tags: ['agent-profiles'],
        summary: 'Read an owned agent profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Owned agent profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AgentResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        operationId: 'updateOwnedAgentProfile',
        tags: ['agent-profiles'],
        summary: 'Update an owned agent profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AgentUpdateInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'Updated agent profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AgentResponse' },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/agents/{slug}/publish': {
      parameters: [{ $ref: '#/components/parameters/AgentSlug' }],
      post: {
        operationId: 'publishOwnedAgentProfile',
        tags: ['agent-profiles'],
        summary: 'Publish an owned agent profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Published agent profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AgentResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        operationId: 'unpublishOwnedAgentProfile',
        tags: ['agent-profiles'],
        summary: 'Unpublish an owned agent profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Unpublished agent profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AgentOnlyResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'kk_ API key',
        description:
          'Exchange an emailed sign-in code for a scoped Karte API key as documented at /skill.md.',
      },
    },
    parameters: {
      AgentSlug: {
        name: 'slug',
        in: 'path',
        required: true,
        description: 'Lowercase 3-50 character agent-profile slug.',
        schema: {
          type: 'string',
          minLength: 3,
          maxLength: 50,
          pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Invalid request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
          },
        },
      },
      Unauthorized: {
        description: 'Missing or invalid Karte API key',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
          },
        },
      },
      NotFound: {
        description: 'Owned agent profile not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
          },
        },
      },
      Conflict: {
        description: 'Requested slug is already taken',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiError' },
          },
        },
      },
    },
    schemas: {
      ApiError: {
        type: 'object',
        required: ['error'],
        properties: { error: { type: 'string' } },
        additionalProperties: false,
      },
      AgentProfile: {
        type: 'object',
        required: [
          'id',
          'slug',
          'pageType',
          'displayName',
          'published',
          'chatEnabled',
          'agentCapabilities',
          'hasBrainEndpointAuth',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          pageType: { type: 'string', const: 'agent' },
          displayName: { type: 'string' },
          bio: { type: ['string', 'null'] },
          avatarUrl: { type: ['string', 'null'], format: 'uri' },
          published: { type: 'boolean' },
          chatEnabled: { type: 'boolean' },
          agentPurpose: { type: ['string', 'null'] },
          agentOperator: { type: ['string', 'null'] },
          agentOperatorUrl: { type: ['string', 'null'], format: 'uri' },
          agentCapabilities: {
            type: 'array',
            items: { type: 'string' },
          },
          agentDisclosurePolicy: { type: ['string', 'null'] },
          brainEndpointUrl: { type: ['string', 'null'], format: 'uri' },
          brainEndpointShape: { type: ['string', 'null'] },
          hasBrainEndpointAuth: { type: 'boolean' },
          verifiedDomain: { type: ['string', 'null'] },
          verifiedAt: { type: ['string', 'null'], format: 'date-time' },
          verificationMethod: { type: ['string', 'null'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AgentCreateInput: {
        type: 'object',
        required: ['slug', 'displayName'],
        properties: {
          slug: { $ref: '#/components/parameters/AgentSlug/schema' },
          ...AGENT_MUTABLE_PROPERTIES,
          chatEnabled: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
      AgentUpdateInput: {
        type: 'object',
        minProperties: 1,
        properties: {
          ...AGENT_MUTABLE_PROPERTIES,
          chatEnabled: { type: 'boolean' },
        },
        additionalProperties: false,
      },
      AgentUrls: {
        type: 'object',
        required: ['profile', 'manifest'],
        properties: {
          profile: { type: 'string', format: 'uri' },
          manifest: { type: 'string', format: 'uri' },
        },
        additionalProperties: false,
      },
      AgentResponse: {
        type: 'object',
        required: ['agent', 'urls'],
        properties: {
          agent: { $ref: '#/components/schemas/AgentProfile' },
          urls: { $ref: '#/components/schemas/AgentUrls' },
        },
        additionalProperties: false,
      },
      AgentOnlyResponse: {
        type: 'object',
        required: ['agent'],
        properties: {
          agent: { $ref: '#/components/schemas/AgentProfile' },
        },
        additionalProperties: false,
      },
      AgentListResponse: {
        type: 'object',
        required: ['agents'],
        properties: {
          agents: {
            type: 'array',
            items: { $ref: '#/components/schemas/AgentProfile' },
          },
        },
        additionalProperties: false,
      },
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
 * Pre-handler: answers only for surfaces the edge itself owns, and returns
 * `null` for everything else so the request reaches OpenNext/Next.js.
 *
 * The allow-list (`EXACT_ROUTES`) is additive — it *grants* the edge specific
 * paths. There is deliberately no subtractive `/api/*` catch-all here: the edge
 * does not know the Next.js route table and must never answer 404 on its
 * behalf. Unknown `/api/*` paths are shaped into JSON by `withApiJsonNotFound`
 * on the way back out instead.
 *
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

  // `/api/*` belongs to Next.js route handlers. Fall through unconditionally —
  // an Accept header must never divert a real API request away from its
  // handler, and the edge must never claim the path is missing.
  if (isApiPath(path)) return null;

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
 * Post-handler: shape Next.js's own 404 for `/api/*` into a JSON error body.
 *
 * The edge deliberately does not know which API routes exist — Next.js does.
 * We call it, and only if *it* reports 404 do we swap the HTML error page for
 * the machine-readable JSON envelope. That is why this shape cannot rot the way
 * the previous `/api/*` catch-all did: a route handler added under
 * `src/app/api/` is reachable with no edge change, because the edge never
 * asserts non-existence.
 *
 * @param {Request} request
 * @param {Response} response Response from the downstream Next.js handler.
 * @returns {Response}
 */
export function withApiJsonNotFound(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return response;
  if (response.status !== 404) return response;
  const path = new URL(request.url).pathname;
  if (!isApiPath(path)) return response;
  const contentType = response.headers.get('content-type') || '';
  // A route handler's own JSON 404 is already machine-readable — leave it.
  if (contentType.includes('application/json')) return response;
  return jsonError(404, 'not_found', `Unknown API path: ${path}`, path);
}

function isApiPath(pathname) {
  return pathname.startsWith('/api/');
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
