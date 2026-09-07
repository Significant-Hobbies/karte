import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/public/contact-form-section', () => ({
  ContactFormSection: () => null,
}));
vi.mock('@/components/public/glass-card', () => ({
  GlassCard: ({ children }) => createElement('section', null, children),
}));

import { PageSectionRenderer } from '../src/components/public/page-section-renderer';
import { isCompletePublicUrl } from '../src/lib/validation';

const section = {
  id: 'fixture',
  type: 'cta',
  title: 'Book a call',
  content: null,
  buttonLabel: 'Book a call',
  buttonUrl:
    'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0v...',
};
const render = (value) =>
  renderToStaticMarkup(
    createElement(PageSectionRenderer, {
      slug: 'fixture',
      section: value,
      accentColor: '#ffffff',
    }),
  );

describe('public section destinations', () => {
  it('keeps a persisted truncated booking link noninteractive', () => {
    const html = render(section);
    expect(html).toContain('Link unavailable');
    expect(html).not.toContain('href=');
  });
  it('preserves a complete booking destination', () => {
    const html = render({
      ...section,
      buttonUrl: 'https://calendar.app.google/fixture',
    });
    expect(html).toContain('href="https://calendar.app.google/fixture"');
    expect(html).not.toContain('Link unavailable');
  });
  it('distinguishes a generic website from an article destination', () => {
    const html = render({
      ...section,
      type: 'blog',
      content:
        'Example|https://example.org/|Summary\nArticle|https://example.org/posts/example|Summary',
    });
    expect(html).toContain('Visit website');
    expect(html).toContain('Read article');
  });
  it.each([
    'javascript:alert(1)',
    'https://example.org/%E2%80%A6',
    'https://example.org/path%2E%2E%2E',
    'https://example.org/%broken',
  ])('rejects incomplete or unusable destination %s', (url) => {
    expect(isCompletePublicUrl(url)).toBe(false);
  });
});
