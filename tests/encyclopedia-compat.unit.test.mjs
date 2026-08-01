import { describe, expect, it } from 'vitest';

import { normalizeEncyclopediaContent } from '../src/lib/encyclopedia-compat.ts';

describe('encyclopedia content compatibility', () => {
  it('normalizes primitive AI-generated metadata to the declared string shape', () => {
    expect(
      normalizeEncyclopediaContent({
        markdown: '<p>Public profile</p>',
        infobox: {
          Occupation: 'Researcher',
          Projects: 10,
          Active: true,
          Unsupported: { nested: true },
        },
        categories: ['AI researchers', 2026, false, { invalid: true }],
      }),
    ).toEqual({
      markdown: '<p>Public profile</p>',
      infobox: {
        Occupation: 'Researcher',
        Projects: '10',
        Active: 'true',
      },
      categories: ['AI researchers', '2026', 'false'],
    });
  });

  it('rejects current-format content without a Markdown string', () => {
    expect(
      normalizeEncyclopediaContent({
        markdown: 10,
        infobox: {},
        categories: [],
      }),
    ).toBeNull();
  });
});
