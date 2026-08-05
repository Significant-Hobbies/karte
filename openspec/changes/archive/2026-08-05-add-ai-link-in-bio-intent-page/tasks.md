## 1. Shared route and content source

- [x] 1.1 Add `content-pages/ai-link-in-bio.mjs` with approved metadata,
  sections, FAQs, source ledger, internal links, and authored Markdown.
- [x] 1.2 Register `/ai-link-in-bio` as the eighth static public route using the
  shared source.

## 2. Human-readable surface

- [x] 2.1 Complete the preserve-mode design preflight and incumbent 1440px
  evidence before feature code.
- [x] 2.2 Add `landing-astro/src/pages/ai-link-in-bio.astro` in the established
  Onyx content-page world with supported JSON-LD and one primary CTA.
- [x] 2.3 Add only necessary responsive prose, table, and CTA styles.
- [x] 2.4 Add one contextual discovery link from home and one from FAQ without
  changing primary navigation labels.
- [x] 2.5 Add `/ai-link-in-bio` to the Worker's cacheable-document and Astro
  static-asset sets so production cannot treat it as a dynamic profile slug.

## 3. Agent-readable and discovery surfaces

- [x] 3.1 Render substantive Markdown from the shared content source for `.md`
  and `Accept: text/markdown` requests.
- [x] 3.2 Align edge fallbacks, `public/index.md`, `llms.txt`, `llms-full.txt`,
  and `/api/ai` with the canonical route and Markdown alternate.

## 4. Regression coverage and documentation

- [x] 4.1 Extend the public route contract tests for eight static routes,
  Worker cache/asset routing, Markdown substance, catalog integrity, and
  private/non-HTML exclusions.
- [x] 4.2 Document the public route and companion Markdown in product surfaces.

## 5. Validation and design review

- [x] 5.1 Run strict change validation and targeted public-route tests.
- [x] 5.2 Build the Astro landing and inspect canonical plus WebPage,
  BreadcrumbList, and FAQPage JSON-LD.
- [x] 5.3 Run lint, typecheck, docs check, full tests, Cloudflare build, and
  `git diff --check` in the approved order.
- [x] 5.4 Capture 390px, 768px, and 1440px after evidence; complete Impeccable
  critique, polish, audit, and the passing preserve-mode design receipt.

## 6. Archive and durable status

- [x] 6.1 Archive the validated OpenSpec change and update the main capability
  specs.
- [x] 6.2 Update `PROJECT_STATUS.md` and route inventory with completed source
  truth only, without claiming production deployment.

## 7. Source control and review

- [ ] 7.1 Review and stage only approved paths, then commit with the approved
  message and push the named feature branch without force.
- [ ] 7.2 Open the approved draft PR linked to the receipted issue, verify
  current-head checks and review evidence, and merge without force.

## 8. Manual release and live verification

- [ ] 8.1 Dispatch the existing deploy workflow on `main` for the exact merged
  40-character revision and verify the matching Worker version serves 100% of
  production traffic.
- [ ] 8.2 Verify live HTML, Markdown negotiation, `.md`, sitemap, `/api/ai`,
  llms indexes, internal links, schemas, companion routes, and SHA parity.
