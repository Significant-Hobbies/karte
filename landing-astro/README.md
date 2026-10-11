# landing-astro

Static Astro source for the public karte.cc landing, FAQ, changelog, and
AI link-in-bio guide. The full Cloudflare build overlays these files into the
OpenNext Worker assets; it is not an independently released Pages product.

## Why a separate project?

The deck is fully static: no DB, no auth, no per-user content. The
Next.js Workers deploy hit p75 LCP ≈ 2.9 s on desktop because OpenNext
was re-rendering the deck every request and shipping a React runtime
for the LCP path. The reference Astro setup at
`fleet/sarthakagrawal/` lands p75 LCP ≈ 360 ms on the same Pages
runtime; this project mirrors that config (output: `'static'`,
`inlineStylesheets: 'always'`, Lightning CSS transformer + minifier).

## Stack

- Astro — `output: 'static'`
- Lightning CSS — transformer + minifier (fleet web-stack standard,
  see `../AGENTS.md` → "Fleet web stack standard")
- `@astrojs/sitemap`
- OpenNext Worker overlay; `wrangler.toml` retains the historical Pages
  project name and is not used by the production release pipeline.

No SSR adapter. The landing uses the shared Gallery React renderer at build
time; supporting pages are authored Astro. The shared neutral-Geist + gold
identity and the public-inbound-desk layout are pure CSS. Shared project-strip
and Ask AI scripts load after the authored product footer.

## Commands

```bash
pnpm install
pnpm dev      # astro dev → http://localhost:4321
pnpm build    # static HTML → dist/
pnpm preview  # serve dist/ locally
```

## Structure

```
landing-astro/
  astro.config.mjs          # Mirrors sarthakagrawal — output: 'static',
                            # inlineStylesheets: 'always', Lightning CSS.
  wrangler.toml             # CF Pages, pages_build_output_dir = "dist".
  src/
    pages/index.astro       # Purpose-led public inbound desk.
    pages/faq.astro         # Current product and commercial boundaries.
    layouts/Layout.astro    # Metadata, schema, fonts, and shared loaders.
    components/             # Shared product header and authored footer.
    lib/product.ts          # Landing and FAQ product truth.
    styles/landing.css      # Shared app identity for supporting content routes.
  public/_headers           # CF Pages cache headers.
```

## Static surface boundaries

- **Create form:** the native GET form sends the chosen slug to `/create`,
  where the application validates it and handles sign-in.
- **Product state:** the page describes person and agent profiles as shipped;
  company ownership, team roles, and approval remain the next validation.
- **Analytics:** the static marketing surface does not ship page-owned PostHog
  JavaScript. Application routes retain their existing instrumentation.
- **OG / Twitter image** — Next.js generates `/opengraph-image` via the
  `opengraph-image.tsx` file convention. The Astro layout points
  `og:image` at `https://karte.cc/opengraph-image`; post-cutover the
  Worker still owns that route, so the URL keeps resolving.

## Build and release boundary

`pnpm cf:build` builds Next/OpenNext, builds this Astro package, and overlays
the static marketing routes into `.open-next/assets`. Local qualification or a
Quick Tunnel does not release production. Production deployment remains the
separate manual `pnpm deploy:cf` workflow.
