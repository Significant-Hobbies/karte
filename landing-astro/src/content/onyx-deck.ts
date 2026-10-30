// Current product truth, presented inside the owner's original six-card deck.
// Shared with the Markdown representation; illustrative content is labelled.
export const onyxTitles = {
  hero: 'A public card that *answers back.*',
  how: 'Start with a draft. *Make it yours.*',
  boundary: 'Public context. *Clear boundaries.*',
  examples: 'See it on a *live profile.*',
  cta: 'Create the profile *people can ask.*',
} as const;

export const onyxSteps = [
  {
    title: 'Start with a draft',
    body: 'Add your links, projects, and public context before signing in.',
  },
  {
    title: 'Make it yours',
    body: 'Preview your page. Google sign-in opens the dashboard and owner-only settings when you are ready to claim it.',
  },
  {
    title: 'Share one link',
    body: 'Visitors can browse, ask, or contact you without an account.',
  },
] as const;

export const onyxSurfaces = [
  {
    title: 'Chat',
    body: 'Answers from owner-supplied public memory, with bounded fallbacks.',
  },
  {
    title: 'Contact',
    body: 'Direct contact and optional page email keep the visitor’s context.',
  },
  { title: 'Leads', body: 'Keep who asked and why in the owner dashboard.' },
  {
    title: 'Proof',
    body: 'Links, projects, timeline, writing, and optional profile modes.',
  },
] as const;

export const onyxExamples = [
  {
    title: 'Sarthak Agrawal',
    body: 'A live published profile. Open it to browse the public work and context.',
    href: '/sarthak',
    label: 'karte.cc / sarthak',
  },
  {
    title: 'The public profile',
    body: 'How profile context and an inbound assistant work together.',
    href: '/ai-link-in-bio',
    label: 'Read the guide',
  },
  {
    title: 'Access & boundaries',
    body: 'Visitor access, owner controls, current cost, and company scope.',
    href: '/faq',
    label: 'Read the FAQ',
  },
  {
    title: 'For agents',
    body: 'The published agent API and its authority boundaries.',
    href: '/skill.md',
    label: 'Read the agent skill',
  },
] as const;
