import { expect, it } from 'vitest';
import { isProfileIntroQuery } from '../src/lib/profile-intro';

it.each([
  'Who is Sarthak?',
  'What does Sarthak Agrawal do?',
  'Tell me about this profile.',
  '  WHO   ARE YOU?  ',
])('recognizes an owner introduction: %s', (query) => {
  expect(isProfileIntroQuery(query, 'Sarthak Agrawal')).toBe(true);
});
it.each([
  'What does Karte help a visitor do, and how does free-ai support it?',
  'Who is the target customer for Karte?',
  'Tell me about Sarthak and how free-ai works',
  'What does free-ai do?',
  'Who is someone else?',
  'Readiness check 2026-09-10: What does Karte help a visitor do, and how does free-ai support it?',
])(
  'preserves retrieval for a substantive or multi-part question: %s',
  (query) => {
    expect(isProfileIntroQuery(query, 'Sarthak Agrawal')).toBe(false);
  },
);
it('treats owner names literally', () => {
  expect(isProfileIntroQuery('Tell me about A+B', 'A+B Smith')).toBe(true);
  expect(isProfileIntroQuery('Tell me about AAAB', 'A+B Smith')).toBe(false);
});
