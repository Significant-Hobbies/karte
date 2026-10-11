import { describe, expect, it } from 'vitest';
import { normalizeLandingHtml } from '../scripts/normalize-landing-html.mjs';

describe('built landing HTML', () => {
  it('moves root declarations after charset and viewport without changing other content', () => {
    const declarations = `--font-sans:&quot;Geist Variable&quot;, system-ui;--background:#0A0A0A;--brand:#C4A46B;--long:${'x'.repeat(1024)}`;
    const attributes = 'lang="en" data-theme="gallery" data-mode="dark"';
    const head =
      '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
    const rest =
      '<title>Karte</title><script type="application/ld+json">{"name":"Karte"}</script></head><body>unchanged</body></html>';
    const html = `<!doctype html><html ${attributes} style="${declarations}"><head>${head}${rest}`;
    expect(Buffer.from(html).indexOf('<meta charset')).toBeGreaterThan(1024);

    const normalized = normalizeLandingHtml(html);
    expect(normalized).toContain(
      `<html ${attributes}><head>${head}<style>html:root:root{${declarations.replaceAll('&quot;', '"')}}`,
    );
    expect(normalized).toContain(
      'html:root .font-display em,html:root .font-display .accent{font-weight:var(--accent-weight,inherit);font-synthesis:none}',
    );
    expect(normalized).toContain(`</style>${rest}`);
    expect(Buffer.from(normalized).indexOf('<meta charset')).toBeLessThan(1024);
    expect(normalizeLandingHtml(normalized)).toBe(normalized);
  });

  it('leaves pages without root inline styles untouched', () => {
    const html =
      '<html lang="en" class="dark"><head><meta charset="utf-8"></head><body style="color:red">Karte</body></html>';
    expect(normalizeLandingHtml(html)).toBe(html);
  });

  it('fails builds with a missing charset or a declaration outside the first 1024 bytes', () => {
    expect(() =>
      normalizeLandingHtml('<html><head></head></html>', 'missing.html'),
    ).toThrow('missing.html: charset missing');
    const html = `<html><head><!--${'é'.repeat(510)}--><meta charset="utf-8"></head></html>`;
    expect(html.indexOf('<meta charset')).toBeLessThan(1024);
    expect(() => normalizeLandingHtml(html, 'late.html')).toThrow(
      'late.html: charset missing or too late',
    );
  });
});
