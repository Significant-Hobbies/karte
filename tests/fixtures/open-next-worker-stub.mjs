/**
 * Stand-in for `.open-next/worker.js` (a build artifact, gitignored, so it is
 * absent in CI). `vitest.config.ts` aliases the OpenNext worker import to this
 * module so `worker.mjs` — the real Cloudflare entrypoint — can be imported and
 * exercised in a plain Node test.
 *
 * Tests set `openNextStub.handler` to decide what "Next.js" answers, and read
 * `openNextStub.calls` to assert that a request actually reached it.
 */

const unconfigured = () =>
  new Response('stub handler not configured', { status: 500 });

export const openNextStub = {
  /** @type {(request: Request) => Response | Promise<Response>} */
  handler: unconfigured,
  /** @type {string[]} */
  calls: [],
  reset() {
    openNextStub.calls = [];
    openNextStub.handler = unconfigured;
  },
};

const worker = {
  async fetch(request) {
    openNextStub.calls.push(new URL(request.url).pathname);
    return await openNextStub.handler(request);
  },
};

export default worker;

// `worker.mjs` re-exports these Durable Object classes from the OpenNext entry.
export class BucketCachePurge {}
export class DOQueueHandler {}
export class DOShardedTagCache {}
