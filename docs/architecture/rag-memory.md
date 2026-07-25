# RAG / profile memory

Profile `infoBlocks` are the owner-authored knowledge base behind each page's
chat. They are indexed and searched through the shared Cloudflare
`knowledgebase` Worker.

## Wiring

- Service binding: `RAG_SERVICE` → `knowledgebase` worker (see `wrangler.jsonc`
  `services`).
- Shared secret: `RAG_SERVICE_KEY` (required for profile-memory
  indexing/search).
- Optional public fallback URL: `RAG_SERVICE_URL` (used only when the service
  binding is unavailable).
- Client code: `src/lib/knowledgebase.ts`, `src/lib/profile-memory.ts`,
  `src/lib/profile-memory-index.ts`.

## What syncs

`infoBlocks` sync to the knowledgebase worker on create / ingest / delete. The
chat endpoint searches them to ground answers in the owner's profile memory.

## Chat-side latency policy

Chat uses Knowledgebase as a lexical-only supplement to Karte's local profile
memory. Trivial conversational turns skip retrieval; other searches are raced
against a 150ms timeout (`searchWithTimeout` in
`src/app/api/chat/[slug]/route.ts`). Semantic embedding and Vectorize misses do
not sit on the public-chat critical path. The timeout aborts the request rather
than leaving retrieval running in the background; chat immediately continues
with local profile memory.

## Legacy SaaS Maker RAG — removed

SaaS Maker RAG is **no longer a fallback** for profile-memory
create/ingest/delete/search. The shared Cloudflare `knowledgebase` Worker is
the only RAG path. The user fields `smProjectId` / `smApiKey` / `smIndexId` and
`smDocumentId` remain as **compatibility linkage columns** only — do not wire
new behavior to them. In particular, chat retrieval is gated by the managed
index linkage (`smIndexId`), never by the legacy user-entered `smApiKey`.

## Direct recall shortcut

For simple factual queries about the recent conversation (e.g. color /
clothing questions), `answerFromRecentConversation` handles them with regex
against visitor messages **before** hitting the LLM. This is an intent-class
shortcut, not RAG. See `docs/knowledge/learnings/new-things.md`.
