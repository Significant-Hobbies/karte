/**
 * Stand-in for the `cloudflare:workers` runtime module, which only exists
 * inside workerd. `rate-limiter-do.mjs` imports `DurableObject` from it and is
 * pulled in transitively by `worker.mjs`, the entrypoint under test.
 */
export class DurableObject {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }
}
