import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

function decodeAttribute(value) {
  const entities = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
  return value.replace(
    /&(#x[\da-f]+|#\d+|quot|apos|amp|lt|gt);/gi,
    (_, entity) =>
      entity[0] === '#'
        ? String.fromCodePoint(
            entity[1].toLowerCase() === 'x'
              ? Number.parseInt(entity.slice(2), 16)
              : Number.parseInt(entity.slice(1), 10),
          )
        : entities[entity.toLowerCase()],
  );
}

export function normalizeLandingHtml(html, page = 'landing HTML') {
  let declarations;
  html = html.replace(/<html\b[^>]*>/i, (tag) =>
    tag.replace(/\s+style=("[^"]*"|'[^']*')/i, (_, attribute) => {
      declarations = decodeAttribute(attribute.slice(1, -1));
      return '';
    }),
  );
  if (declarations) {
    // Outrank the pinned theme's [data-theme][data-mode] rules, even though
    // its stylesheet comes later. Keep normal importance and values intact.
    let css = `html:root:root{${declarations}}`;
    if (declarations.includes('--font-')) {
      // The pinned theme ties these two rules to html[style*="--font-"].
      // Preserve their behavior and specificity after removing that attribute.
      css +=
        'html:root .font-display em,html:root .font-display .accent{font-weight:var(--accent-weight,inherit);font-synthesis:none}';
    }
    html = html.replace(
      /(<meta\s+charset\b[^>]*>\s*(?:<meta\s+name=["']viewport["'][^>]*>)?)/i,
      (_, metas) => `${metas}<style>${css.replace(/</g, '\\3c ')}</style>`,
    );
  }
  const charset = /<meta\s+charset\b[^>]*>/i.exec(html);
  const offset = charset ? Buffer.byteLength(html.slice(0, charset.index)) : -1;
  assert(
    charset && offset + Buffer.byteLength(charset[0]) <= 1024,
    `[landing-html] ${page}: charset missing or too late (byte ${offset})`,
  );
  return html;
}

export async function normalizeBuiltLandingHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await normalizeBuiltLandingHtml(path);
    } else if (entry.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      const normalized = normalizeLandingHtml(html, path);
      if (normalized !== html) await writeFile(path, normalized);
    }
  }
}
