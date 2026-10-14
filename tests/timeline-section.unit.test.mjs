import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TimelineSection } from '../src/components/public/timeline-section';

const events = Array.from({ length: 12 }, (_, index) => ({
  id: `event-${index + 1}`,
  type: 'shipped-project',
  title: `Milestone ${index + 1}`,
  body: `Authored detail ${index + 1}`,
  whereLabel: null,
  link: `https://example.test/${index + 1}`,
  whenLabel: `October ${2026 - index}`,
}));

function render(items) {
  return renderToStaticMarkup(
    createElement(TimelineSection, {
      events: items,
      accentColor: '#c4a46b',
    }),
  );
}

describe('public timeline disclosure', () => {
  it('shows recent events and keeps every earlier destination and detail in the disclosure', () => {
    const html = render(events);
    const detailsStart = html.indexOf('<details');

    expect(detailsStart).toBeGreaterThan(0);
    expect(html).toContain('Explore 9 earlier milestones');
    expect(html.slice(0, detailsStart)).toContain('Milestone 3');
    expect(html.slice(0, detailsStart)).not.toContain('Milestone 4');
    expect(html.slice(detailsStart)).toContain('Milestone 4');
    expect(html.match(/<li /g)).toHaveLength(12);
    for (const [index, event] of events.entries()) {
      expect(html).toContain(`Authored detail ${index + 1}`);
      expect(html).toContain(`href="${event.link}"`);
    }
  });

  it('keeps short timelines fully visible', () => {
    const html = render(events.slice(0, 5));
    expect(html).not.toContain('<details');
    expect(html.match(/<li /g)).toHaveLength(5);
  });

  it('omits empty timelines', () => {
    expect(render([])).toBe('');
  });
});
