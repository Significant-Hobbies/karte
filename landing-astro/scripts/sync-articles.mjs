#!/usr/bin/env node
// Convert SEO article drafts from marketing/articles/karte/ into:
//   landing-astro/src/pages/articles/<slug>.md  — Astro pages (Article layout)
//   content-pages/articles.mjs                  — slug metadata + full bodies,
//     consumed by src/app/sitemap.ts and src/lib/public-route-markdown.ts so
//     every article gets a sitemap entry and a `/articles/<slug>.md` alternate
//     through the existing public-route-markdown pipeline.
//
// Usage: node landing-astro/scripts/sync-articles.mjs <drafts-dir>
//
// <drafts-dir> contains flat *.md files with marketing-draft frontmatter
// (title, slug, target_query, search_intent, meta_title, meta_description)
// and working sections (Outline, Internal-Link Suggestions, Source Notes)
// that must never be published.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const [draftsDir] = process.argv.slice(2);
if (!draftsDir) {
  console.error(
    'usage: node landing-astro/scripts/sync-articles.mjs <drafts-dir>',
  );
  process.exit(1);
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEADING = /^#{1,4} /;
const SKIP_HEADING = /^(outline|internal[- ]link\w*|source notes)\b/i;
const INLINE_NOTE = /\*?\[Internal[- ]Link\s*Suggestions?:[^\]]*\]\*?/gi;
const INLINE_NOTE_LINE =
  /^[ \t]*\*?[([]?\s*Internal[- ]Link\s*Suggestions?:.*[)\]*]?[ \t]*$/gim;
const DRAFT_COMMENT =
  /<!--[\s\S]*?(?:source notes|do not publish)[\s\S]*?-->/gi;
const today = new Date().toISOString().slice(0, 10);
const pagesDir = new URL('../src/pages/articles/', import.meta.url).pathname;
const modulePath = new URL('../../content-pages/articles.mjs', import.meta.url)
  .pathname;

const parseFrontmatter = (raw) => {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('missing frontmatter');
  const data = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return { data, body: match[2] };
};

const stripWorkingSections = (body) => {
  const kept = [];
  // skip = false | "heading" | "outline" — a `**Outline:**` block ends at `---`,
  // a skipped heading section ends at the next heading.
  let skip = false;
  for (const line of body.split('\n')) {
    if (/^# /.test(line)) {
      skip = false;
      continue;
    } // drafts may carry an h1; the layout renders its own
    if (HEADING.test(line)) {
      const text = line.replace(/^#+\s*/, '').replace(/^[[*]+\s*/, '');
      skip = SKIP_HEADING.test(text) ? 'heading' : false;
      if (!skip) kept.push(line);
      continue;
    }
    if (!skip && /^\*\*Outline:?\*\*/.test(line.trim())) {
      skip = 'outline';
      continue;
    }
    if (line.trim() === '---') {
      if (skip === 'outline') skip = false;
      continue;
    }
    if (!skip) kept.push(line);
  }
  return kept
    .join('\n')
    .replace(DRAFT_COMMENT, '')
    .replace(INLINE_NOTE_LINE, '')
    .replace(INLINE_NOTE, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const yamlString = (value) =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

const articles = [];
for (const file of readdirSync(draftsDir)
  .filter((f) => f.endsWith('.md'))
  .sort()) {
  const { data, body } = parseFrontmatter(
    readFileSync(join(draftsDir, file), 'utf8'),
  );
  const slug = (data.slug || basename(file, '.md'))
    .split('/')
    .filter(Boolean)
    .pop();
  if (!data.title?.trim()) throw new Error(`${file}: missing title`);
  if (!data.meta_description?.trim())
    throw new Error(`${file}: missing meta_description`);
  if (!SLUG.test(slug)) throw new Error(`${file}: bad slug ${slug}`);
  const clean = stripWorkingSections(body);
  if (!clean)
    throw new Error(`${file}: empty body after stripping working sections`);
  articles.push({
    slug,
    title: data.title.trim(),
    description: data.meta_description.trim(),
    date: today,
    readingMinutes: Math.max(1, Math.ceil(clean.split(/\s+/).length / 220)),
    markdown: clean,
  });
}

mkdirSync(pagesDir, { recursive: true });
for (const article of articles) {
  const out = [
    '---',
    'layout: ../../layouts/Article.astro',
    `title: ${yamlString(article.title)}`,
    `description: ${yamlString(article.description)}`,
    `date: "${article.date}"`,
    'author: "Sarthak Agrawal"',
    `readingMinutes: ${article.readingMinutes}`,
    '---',
    '',
    article.markdown,
    '',
  ].join('\n');
  writeFileSync(join(pagesDir, `${article.slug}.md`), out);
}

// Runtime module for sitemap + markdown alternates. Bodies are embedded via
// JSON.parse so the markdown can contain backticks/${} safely.
const metadata = articles.map(
  ({ slug, title, description, date, readingMinutes }) => ({
    slug,
    title,
    description,
    date,
    readingMinutes,
  }),
);
const bodies = Object.fromEntries(articles.map((a) => [a.slug, a.markdown]));
const moduleSource = `// Generated by landing-astro/scripts/sync-articles.mjs — do not hand-edit.
export const ARTICLES = Object.freeze(${JSON.stringify(metadata, null, 2)});

export const ARTICLE_MARKDOWN = Object.freeze(JSON.parse(${JSON.stringify(JSON.stringify(bodies))}));
`;
writeFileSync(modulePath, moduleSource);

console.info(
  `Synced ${articles.length} article(s) into landing-astro/src/pages/articles/ + content-pages/articles.mjs`,
);
