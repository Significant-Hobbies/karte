import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const google = 'next/dist/compiled/@next/font/dist/google/';
const { findFontFilesInCss } = require(`${google}find-font-files-in-css.js`);
const fetchCss = require(`${google}fetch-css-from-google-fonts.js`);
const fetchFont = require(`${google}fetch-font-file.js`);
const font = readFileSync(
  new URL('../landing-astro/src/assets/onyx/inter.woff2', import.meta.url),
);
const loaderPath = require.resolve(`${google}loader.js`);

function stylesheet(url, format = "format('woff2')") {
  return [
    '/* latin */',
    '@font-face {',
    "  font-family: 'Inter';",
    '  font-style: normal;',
    '  font-weight: 400;',
    '  font-display: swap;',
    `  src: url(${url}) ${format};`,
    '}',
  ].join('\n');
}

afterEach(() => {
  vi.restoreAllMocks();
  delete require.cache[loaderPath];
});

describe('installed Next Google font URL backport', () => {
  it.each([
    [
      'https://fonts.gstatic.com/l/font?kit=a=b&skey=c&v=v20',
      "format('woff2')",
      'woff2',
    ],
    [
      'https://fonts.gstatic.com/l/font?kit=a%2Bb&skey=c',
      'format("woff")',
      'woff',
    ],
    ['https://fonts.gstatic.com/l/font', "format('truetype')", 'ttf'],
    ['https://fonts.gstatic.com/l/font', "format('opentype')", 'otf'],
    ['https://fonts.gstatic.com/l/font', "format('embedded-opentype')", 'eot'],
    ['https://fonts.gstatic.com/l/font', '', 'woff2'],
    ['https://fonts.gstatic.com/l/font', "format('unknown')", 'woff2'],
    [
      'https://fonts.gstatic.com/s/font.ttf?kit=a&v=1#font',
      "format('woff2')",
      'ttf',
    ],
    ['https://fonts.gstatic.com/l/font?kit=a.woff', "format('woff2')", 'woff2'],
    ['https://fonts.gstatic.com/s/font.woff2', "format('woff2')", 'woff2'],
  ])('resolves %s using pathname or CSS format', (url, format, extension) => {
    const css = stylesheet(url, format);
    expect(findFontFilesInCss(`${css}\n${css}`, ['latin'])).toEqual([
      { googleFontFileUrl: url, preloadFontFile: true, ext: extension },
    ]);
    expect(findFontFilesInCss(css, [])[0].preloadFontFile).toBe(false);
  });

  it('emits identical font bytes, CSS, fallback metrics and configured options for extensionless URLs', async () => {
    vi.spyOn(fetchCss, 'fetchCSSFromGoogleFonts');
    vi.spyOn(fetchFont, 'fetchFontFile').mockResolvedValue(font);
    async function render(url) {
      delete require.cache[loaderPath];
      const loader = require(loaderPath).default;
      fetchCss.fetchCSSFromGoogleFonts.mockResolvedValue(stylesheet(url));
      const emitted = [];
      const result = await loader({
        functionName: 'Inter',
        data: [
          {
            weight: '400',
            style: 'normal',
            variable: '--font-inter',
            subsets: ['latin'],
          },
        ],
        isDev: false,
        isServer: true,
        emitFontFile: (bytes, extension, preload, sizeAdjust) => {
          emitted.push({ bytes, extension, preload, sizeAdjust });
          return `/_next/static/media/fixture.${extension}`;
        },
      });
      expect(emitted).toEqual([
        { bytes: font, extension: 'woff2', preload: true, sizeAdjust: true },
      ]);
      expect(result.css).toContain('/_next/static/media/fixture.woff2');
      expect(result.variable).toBe('--font-inter');
      expect(result.weight).toBe('400');
      expect(result.style).toBe('normal');
      return result;
    }
    const control = await render(
      'https://fonts.gstatic.com/s/inter/font.woff2',
    );
    for (const url of [
      'https://fonts.gstatic.com/l/font?kit=a%2Bb%25c=d&skey=test&v=v20',
      'https://fonts.gstatic.com/s/inter/font.woff2?version=1#font',
    ])
      expect(await render(url)).toEqual(control);
    expect(fetchFont.fetchFontFile).toHaveBeenCalledTimes(3);
  });
});
