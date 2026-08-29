import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      // `.open-next/worker.js` is a gitignored build artifact, so it does not
      // exist in CI. Alias it to a stub so `worker.mjs` — the real Cloudflare
      // entrypoint — can be imported and exercised by unit tests.
      {
        find: /^\.\/\.open-next\/worker\.js$/,
        replacement: resolve(
          __dirname,
          'tests/fixtures/open-next-worker-stub.mjs',
        ),
      },
      // `cloudflare:workers` only exists inside workerd; `rate-limiter-do.mjs`
      // (imported by `worker.mjs`) needs `DurableObject` from it.
      {
        find: 'cloudflare:workers',
        replacement: resolve(
          __dirname,
          'tests/fixtures/cloudflare-workers-stub.mjs',
        ),
      },
      { find: '@', replacement: resolve(__dirname, 'src') },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.unit.test.mjs'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.d.ts',
        '**/index.ts',
        'node_modules',
        'dist',
        '.next',
        '.wrangler',
      ],
      thresholds: { lines: 10, functions: 13, branches: 8, statements: 9 },
    },
  },
});
