import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ slug: 'synthetic-profile' }),
}));

import { ChatWidget } from '../src/components/public/chat-widget';
import { ProfileHero } from '../src/components/public/profile-hero';

const render = (Component, props) =>
  renderToStaticMarkup(createElement(Component, props));

describe('public profile actions', () => {
  it('keeps author text and destinations while using decorative stroke icons', () => {
    const html = render(ProfileHero, {
      displayName: 'Synthetic Author',
      bio: 'Authored text 💬 🔥 stays intact.',
      avatarUrl: null,
      location: null,
      accentColor: '#c4a46b',
      serifFontVar: 'serif',
      chatEnabled: true,
      hasMessenger: true,
      primaryChatCta: 'Start chat',
      calendarUrl: 'https://fixture.invalid/calendar',
      newsletterUrl: 'https://fixture.invalid/newsletter',
      tipUrl: 'https://fixture.invalid/tip',
      socialLinks: [],
      inboxEmailAddress: 'synthetic@fixture.invalid',
    });

    expect(html).toContain('Authored text 💬 🔥 stays intact.');
    expect(html).toContain('Start chat');
    for (const path of ['calendar', 'newsletter', 'tip']) {
      expect(html).toContain(`href="https://fixture.invalid/${path}"`);
    }
    expect(html).toContain('href="mailto:synthetic@fixture.invalid"');
    expect(html).not.toMatch(/📅|☕|✉︎/u);
    expect(html.match(/<svg[^>]*aria-hidden="true"/g)).toHaveLength(5);
    expect(html.match(/💬/gu)).toHaveLength(1);
  });

  it.each([
    { chatEnabled: true, dmMode: 'off', label: 'Chat' },
    { chatEnabled: false, dmMode: 'form', label: 'Message' },
  ])('keeps the messenger entry accessible for $label', (props) => {
    const html = render(ChatWidget, {
      slug: 'synthetic-profile',
      displayName: 'Synthetic Author',
      ...props,
    });

    expect(html).toContain('aria-label="Open messenger"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="karte-messenger-synthetic-profile"');
    expect(html).toContain(props.label);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).not.toMatch(/💬|✕/u);
  });

  it('does not reserve a dock when both chat and messages are disabled', () => {
    expect(
      render(ChatWidget, {
        slug: 'synthetic-profile',
        displayName: 'Synthetic Author',
        chatEnabled: false,
        dmMode: 'off',
      }),
    ).toBe('');
  });
});
