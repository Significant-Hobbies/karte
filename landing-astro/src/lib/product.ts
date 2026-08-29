export const product = {
  name: 'Karte',
  title: 'Karte — A public profile that answers back',
  description:
    'Karte gives creators and independent operators one public profile for links, projects, visitor questions, and better-contextualized inbound.',
  purpose:
    'A creator-owned public profile and contextual inbound assistant for people who want visitors to understand their work before getting in touch.',
  state:
    'Live and maintained for personal use. Person and agent profiles ship today; company and team workflows remain the next validation.',
  access:
    'Visitors browse and ask questions without an account. Profile owners use Google sign-in to claim and manage a page.',
  commercial:
    'There is no billing in the current product. Karte is free to use today, but the long-term commercial model is not committed.',
  ai: 'Profile-grounded replies use Karte’s product AI gateway, with an optional owner-configured provider key. Bounded fallbacks keep the public profile useful when AI is unavailable.',
} as const;

export const faqs = [
  {
    question: 'What is Karte?',
    answer:
      'Karte is a public profile with an inbound assistant. A creator or independent operator can publish links, projects, timeline entries, and profile context; visitors can browse, ask a question, or send a message with enough context for a more useful handoff.',
  },
  {
    question: 'Who is Karte for today?',
    answer:
      'The shipped product is for one profile owner: creators, builders, consultants, and independent operators. Karte also supports public agent profiles and machine-readable agent manifests. Company cards are a planned validation, not a shipped team product.',
  },
  {
    question: 'How is this different from a normal link-in-bio?',
    answer:
      'A normal link list routes every visitor to another page. Karte keeps owned context together, lets a visitor ask a profile-grounded question, and carries the resulting intent into chat, contact, email, leads, and the owner dashboard.',
  },
  {
    question: 'Do visitors need an account?',
    answer:
      'No. Published profiles, links, projects, timeline entries, ready profile modes, and visitor-facing contact or chat can be used without a visitor account. The owner signs in with Google to claim and manage the page.',
  },
  {
    question: 'Is Karte free?',
    answer:
      'There is no billing in the current product, so Karte is free to use today. That is a statement about the current release, not a promise that every future feature or plan will remain free forever.',
  },
  {
    question: 'What does the AI know?',
    answer:
      'The assistant is grounded in the public content and memory the profile owner supplies. It can answer from that context and fall back to a bounded public-bio response; it should not invent private knowledge or speak for the owner beyond the published material.',
  },
  {
    question: 'What can an owner manage?',
    answer:
      'The authenticated dashboard manages profile sections, links, projects, timeline entries, appearance, chat and contact settings, inboxes, leads, analytics, custom domains, and optional encyclopedia, newspaper, and roast modes.',
  },
  {
    question: 'Does Karte support company profiles?',
    answer:
      'Not as a complete company workflow yet. The current profile foundation can introduce an individual or agent, but company-specific ownership, team roles, approval, and repeated company use still need a focused workflow and a real-company test.',
  },
] as const;
