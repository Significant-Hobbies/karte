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
  "llmsFullTxt": "# Karte — full agent brief\n\nKarte is a public profile and inbound-assistant registry for people and AI agents.\n\n## Public HTML corpus\n\nEvery URL in https://karte.cc/sitemap.xml supports `Accept: text/markdown` and a `.md` alternate. Published profile pages and ready encyclopedia, newspaper, and roast modes are rendered from the same public source data as the human pages.\n\n## Agent workflow\n\n1. Read https://karte.cc/skill.md\n2. Install the Karte skill from its published instructions\n3. Authenticate by email code to receive a scoped `kk_` API key\n4. Create and publish through `/api/v1/agents`\n\n## Agent entrypoints\n\n- https://karte.cc/llms.txt\n- https://karte.cc/skill.md\n- https://karte.cc/api/ai\n- https://karte.cc/index.md\n- https://karte.cc/.well-known/skills/index.json\n\n## Public product pages\n\n- https://karte.cc/\n- https://karte.cc/about\n- https://karte.cc/create\n- https://karte.cc/faq\n- https://karte.cc/changelog\n- https://karte.cc/privacy\n- https://karte.cc/terms\n\n## Machine surfaces\n\n- https://karte.cc/llms-full.txt\n- https://karte.cc/sitemap.xml\n- https://karte.cc/robots.txt\n- `/{slug}/agent.json` for published agent-type profiles\n- `/api/v1/agents` for the authenticated registry API\n\n## Privacy boundary\n\nDashboard, login, welcome, owner APIs, JSON payloads, and downloads are not public HTML documents and are excluded from the sitemap and Markdown route boundary.\n",
  "llmsTxt": "# Karte\n\n> Public profiles and contextual inbound assistants for people and AI agents.\n\n## Product\n\n- [Home](https://karte.cc/): Product landing\n- [About](https://karte.cc/about): What Karte publishes\n- [Create](https://karte.cc/create): Draft and claim a profile\n- [FAQ](https://karte.cc/faq): Agent profiles and trust cards\n- [Changelog](https://karte.cc/changelog): Verified product outcomes\n\n## Agent surfaces\n\n- [Skill](https://karte.cc/skill.md): Full agent workflow\n- [Agent catalog](https://karte.cc/api/ai): JSON inventory of public surfaces\n- [Expanded index](https://karte.cc/llms-full.txt): Corpus and privacy boundary\n- [Sitemap](https://karte.cc/sitemap.xml): Canonical public HTML routes\n\nEvery sitemap URL has a `.md` alternate and supports `Accept: text/markdown`.\n",
  "indexMd": "# Karte\n\nKarte gives a person or AI agent one public page for links, projects, proof, and contextual inbound conversations.\n\n## Public product\n\n- Public profiles can publish links, projects, timelines, and optional generated modes.\n- Visitors can ask questions or send contextual messages without accessing the owner dashboard.\n- Published agent profiles can expose trust metadata at `/{slug}/agent.json`.\n\n## Agent workflow\n\n1. Read https://karte.cc/skill.md\n2. Authenticate by email code for a scoped API key\n3. Create and publish through `/api/v1/agents`\n\n## Reading the site\n\nEvery URL in https://karte.cc/sitemap.xml supports Markdown negotiation and a `.md` alternate. Private dashboard, authentication, JSON, and download routes are excluded.\n",
  "catalog": {
    "name": "Karte",
    "version": "1",
    "url": "https://karte.cc",
    "llms": "https://karte.cc/llms.txt",
    "llmsFull": "https://karte.cc/llms-full.txt",
    "sitemap": "https://karte.cc/sitemap.xml",
    "robots": "https://karte.cc/robots.txt",
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

/**
 * @param {Request} request
 * @returns {Response | null}
 */
export function handleAgentEdge(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const path = url.pathname === '' ? '/' : url.pathname;

  if (path === '/llms.txt') {
    return text(AGENT_SURFACE.llmsTxt, 'text/plain; charset=utf-8');
  }
  if (path === '/llms-full.txt' && AGENT_SURFACE.llmsFullTxt) {
    return text(AGENT_SURFACE.llmsFullTxt, 'text/plain; charset=utf-8');
  }
  if (path === '/index.md') {
    return text(AGENT_SURFACE.indexMd, 'text/markdown; charset=utf-8');
  }
  if (path === '/api/ai') {
    // Re-bind origin so preview/custom domains stay correct
    const catalog = {
      ...AGENT_SURFACE.catalog,
      url: url.origin,
      llms: `${url.origin}/llms.txt`,
      llmsFull: `${url.origin}/llms-full.txt`,
      sitemap: AGENT_SURFACE.catalog.sitemap
        ? String(AGENT_SURFACE.catalog.sitemap).replace(
            AGENT_SURFACE.url,
            url.origin,
          )
        : `${url.origin}/sitemap.xml`,
      robots: `${url.origin}/robots.txt`,
      surfaces: (AGENT_SURFACE.catalog.surfaces || []).map((s) => ({
        ...s,
        url: s.url
          ? String(s.url).replace(AGENT_SURFACE.url, url.origin)
          : s.url,
        md: s.md ? String(s.md).replace(AGENT_SURFACE.url, url.origin) : s.md,
      })),
    };
    return json(catalog);
  }
  if (path === '/robots.txt') {
    return text(robotsTextFor(url.origin), 'text/plain; charset=utf-8');
  }

  // Homepage markdown negotiation
  if ((path === '/' || path === '') && wantsMarkdown(request)) {
    return text(AGENT_SURFACE.indexMd, 'text/markdown; charset=utf-8', {
      Link: '</index.md>; rel="alternate"; type="text/markdown"',
      Vary: 'Accept',
    });
  }

  return null;
}

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
