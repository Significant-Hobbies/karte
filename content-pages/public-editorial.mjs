export const repository = 'https://github.com/Significant-Hobbies/karte';
export const releases = [
  {
    date: '2026-07-25',
    title: 'Faster, more dependable profile answers',
    outcomes: [
      'Public profile chat now uses the managed Knowledgebase by default instead of requiring a visitor-facing document key.',
      'Short conversational questions skip unnecessary retrieval, while a bounded local-memory fallback keeps replies moving.',
    ],
  },
  {
    date: '2026-07-25',
    title: 'Public chat recovered gracefully',
    outcomes: [
      'Empty provider streams no longer leave visitors with a blank or failed answer.',
      'Karte falls through progressively smaller, profile-grounded prompts before offering a deterministic public-bio response.',
    ],
  },
  {
    date: '2026-07-13',
    title: 'Creator Opportunity Desk',
    outcomes: [
      'Creators can turn an inbound partnership signal into a structured opportunity brief.',
      'The workflow remains approval-first, keeping outreach and commitment under the creator’s control.',
    ],
  },
  {
    date: '2026-07-09',
    title: 'Karte became a public inbound assistant',
    outcomes: [
      'Public pages can answer visitor questions from profile context and collect cleaner contact intent.',
      'Inbound messages flow into Lead Radar so the creator can follow up with context.',
    ],
  },
];

export const faqCopy = {
  eyebrow: 'FAQ · PRODUCT BOUNDARIES',
  title: 'Questions, answered',
  emphasis: 'plainly.',
  conclusion: 'These answers describe the product that exists now.',
  primary: { label: 'Create a page', href: '/create' },
  secondary: { label: 'Read the profile comparison', href: '/ai-link-in-bio' },
};
export const changelogCopy = {
  eyebrow: 'Product history',
  title: 'Changelog',
  lede: 'Meaningful improvements to public profiles, visitor conversations, and creator follow-up.',
};
export const articlesCopy = {
  eyebrow: 'Writing',
  title: 'Articles',
  lede: 'Essays on public profiles, contextual inbound, and the requirements behind interactive profile pages.',
};
export const ARTICLE_AUTHOR = 'Sarthak Agrawal';
export function displayDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
export function articleDisplayMeta(article) {
  return [
    article.date ? displayDate(article.date) : null,
    `By ${article.author || ARTICLE_AUTHOR}`,
    article.readingMinutes ? `${article.readingMinutes} min read` : null,
  ].filter(Boolean);
}
