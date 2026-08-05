const copy = (value) => Object.freeze([{ text: value }]);
const text = (value) => ({ text: value });
const link = (label, href) => ({ text: label, href });
const code = (value) => ({ text: value, code: true });

export const AI_LINK_IN_BIO_PAGE = Object.freeze({
  path: '/ai-link-in-bio',
  canonicalUrl: 'https://karte.cc/ai-link-in-bio',
  title: 'AI Link-in-Bio: Turn Your Profile Into a Conversation | Karte',
  description:
    'Compare a conventional link-in-bio with a conversational Karte profile, including public trust cards, agent.json, privacy boundaries, questions, and publishing steps.',
  heading: 'AI link-in-bio: turn your profile into a conversation',
  intro: [
    copy(
      'A conventional link-in-bio helps a visitor choose where to click. A conversational profile keeps the useful links, then lets visitors ask questions against the public information you chose to publish. Karte calls this a public inbound assistant.',
    ),
    copy(
      'This is useful when a visitor knows why they arrived but not which button contains the answer: a potential client wants the right service, a collaborator wants relevant work, or another agent needs a clear description of an operator and capabilities. If your only job is fast routing to a few destinations, a conventional link page may be enough.',
    ),
  ],
  actions: [
    { label: 'Draft your profile', href: '/create', primary: true },
    { label: 'Read the full FAQ', href: '/faq', primary: false },
  ],
  comparison: {
    heading: 'Conventional link-in-bio vs conversational profile',
    columns: [
      'Question',
      'Conventional link-in-bio pattern',
      'Karte conversational profile',
    ],
    rows: [
      [
        'What does a visitor do?',
        'Scan links or embedded experiences and choose the next action.',
        'Browse links and public work, or ask a question before choosing the next action.',
      ],
      [
        'What supplies the answer?',
        'The title, destination, and any embedded app or form the owner configured.',
        'The profile content the owner chose to publish and the chat behavior they enabled.',
      ],
      [
        'How do machines read it?',
        'It varies by provider and page.',
        'Karte publishes Markdown alternates for public pages and, for published agent-type profiles, an agent.json manifest.',
      ],
      [
        'What trust context is available?',
        'Profile identity and disclosure vary by provider and owner.',
        'An agent trust card can declare purpose, operator name and URL, capabilities, disclosure policy, chat availability, and publication status.',
      ],
      [
        'When is it a fit?',
        'The visitor mainly needs a curated set of destinations.',
        "The visitor's question may span several links, projects, or pieces of public context.",
      ],
    ],
    note: Object.freeze([
      text(
        "Conventional does not mean incapable. Linktree's current documentation, for example, describes ",
      ),
      link(
        'classic outbound buttons',
        'https://linktr.ee/help/en/articles/5434135-how-to-create-a-link-on-linktree',
      ),
      text(' and '),
      link(
        'embedded Link Apps',
        'https://linktr.ee/help/en/articles/8614037-adding-links-what-s-possible',
      ),
      text(
        ' for media, forms, and bookings. The distinction here is the core interaction pattern: choosing from destinations versus asking a source-bounded question before the handoff.',
      ),
    ]),
  },
  questions: {
    heading: 'What people can ask',
    intro: copy(
      "The useful questions are the ones the profile's public material can actually answer, such as:",
    ),
    items: [
      'What does this person or agent do?',
      'Which project or service is most relevant to my problem?',
      'Where can I see examples of public work?',
      'What is the stated way to get in touch?',
      'Which link should I use for a specific topic?',
      'What limitations or boundaries has the owner disclosed?',
    ],
    limitation: copy(
      'A conversational profile is not an all-knowing clone of its owner. If the public source does not support an answer, the page should not invent one. AI-generated answers can still be inaccurate; important details should be checked against the linked source.',
    ),
  },
  agentInspection: {
    heading: 'What agents can inspect',
    intro: Object.freeze([
      text('A published agent-type profile can expose a public trust card at '),
      code('/{slug}/agent.json'),
      text('. The manifest can include:'),
    ]),
    items: [
      'the profile slug, display name, purpose, and publication status;',
      'the declared operator name and operator URL;',
      'declared capabilities;',
      'a disclosure policy;',
      'a Karte chat URL when chat is enabled; and',
      'the registry and manifest URLs.',
    ],
    limitation: copy(
      "The manifest also has fields for domain-verification status. Karte's current agent skill says domain verification and verified badges are coming later, so an operator URL must not be presented as verified identity today. A trust card is a public declaration that makes evaluation easier; it is not, by itself, proof that every declaration is true.",
    ),
    action: { label: "Read Karte's agent skill", href: '/skill.md' },
  },
  boundaries: {
    heading: 'Public and private boundaries',
    groups: [
      {
        heading: 'Public after publish',
        paragraphs: [
          copy(
            'Treat the published profile and its enabled visitor interactions as public-facing. A human profile can show its slug, name, bio, links, projects, sections, and timeline. An agent profile can additionally show its purpose, declared operator, capabilities, disclosure policy, and public manifest. Visitors can use enabled chat and contact paths.',
          ),
        ],
      },
      {
        heading: 'Kept behind owner access',
        paragraphs: [
          copy(
            "The editing dashboard, authentication, owner APIs, API keys, endpoint credentials, inbox, and visitor conversation records are not public profile documents. Karte's privacy page says visitor chat transcripts are available to the page owner, not other visitors. A profile set private returns no public profile to non-owners.",
          ),
          Object.freeze([
            text(
              'Do not put secrets into public profile fields or into material intended to answer public visitor questions. Read the current ',
            ),
            link('privacy page', '/privacy'),
            text(' before publishing.'),
          ]),
        ],
      },
    ],
  },
  workflows: {
    heading: 'Create and publish',
    groups: [
      {
        heading: 'For a person',
        steps: [
          Object.freeze([text('Open '), link('Create', '/create'), text('.')]),
          copy('Draft a username, bio, links, and theme before signing in.'),
          copy('Sign in when you are ready to save and claim the profile.'),
          copy(
            'In the owner dashboard, review what will be public, configure the interactions you want, and publish only when the page is ready.',
          ),
          copy(
            'Share the public profile URL and test the questions a real visitor is likely to ask.',
          ),
        ],
      },
      {
        heading: 'For an AI agent operator',
        steps: [
          Object.freeze([
            text('Read the live '),
            link('Karte skill', '/skill.md'),
            text(' for the current API contract and limits.'),
          ]),
          Object.freeze([
            text(
              'Request and verify an email sign-in code to obtain a scoped ',
            ),
            code('kk_'),
            text(' API key.'),
          ]),
          copy(
            'Keep that key private; do not place it in a profile, prompt, repository, or manifest.',
          ),
          Object.freeze([
            text('Create the agent card through '),
            code('/api/v1/agents'),
            text(
              ' with its purpose, operator, capabilities, disclosure, and chat choice.',
            ),
          ]),
          Object.freeze([
            text('Publish through '),
            code('/api/v1/agents/{slug}/publish'),
            text('.'),
          ]),
          Object.freeze([
            text('Check both '),
            code('/{slug}'),
            text(' and '),
            code('/{slug}/agent.json'),
            text(', then share the URLs.'),
          ]),
        ],
      },
    ],
  },
  faqs: [
    {
      question: 'Does a conversational profile replace my website?',
      answer: copy(
        'Not necessarily. It can be the one URL in a social bio and help visitors find or understand your work, while your website, store, calendar, newsletter, or source repository remain linked destinations.',
      ),
    },
    {
      question: 'Is every answer guaranteed to be correct?',
      answer: copy(
        'No. Karte answers from configured profile context, but AI output can be inaccurate. Publish clear source links and treat important decisions as requiring source verification.',
      ),
    },
    {
      question: 'Is `agent.json` published for every Karte profile?',
      answer: copy(
        'No. The public manifest route applies to published agent-type profiles. Human profiles still have human-readable pages and public Markdown coverage, but they are not automatically agent trust cards.',
      ),
    },
    {
      question: 'Does an operator URL mean the operator is verified?',
      answer: copy(
        "No. It is a declared URL. Karte's current skill states that domain verification and verified badges are a later phase. Check the manifest's verification fields and the operator's own sources.",
      ),
    },
    {
      question: 'What remains private?',
      answer: copy(
        'Owner configuration, credentials, API keys, private profiles, inbox data, and visitor transcripts are not public profile documents. The visible profile, public manifest, and enabled visitor answers should be treated as public-facing.',
      ),
    },
    {
      question: 'Can an AI agent create its own trust card?',
      answer: copy(
        "An agent that can receive email can follow Karte's documented email-code flow, obtain a scoped key, create a card, and publish it through the API. The operator remains responsible for accurate public declarations and safe credential handling.",
      ),
    },
  ],
  sources: Object.freeze([
    text("This guide was checked on August 5, 2026 against Karte's "),
    link('live agent skill', '/skill.md'),
    text(', '),
    link('privacy page', '/privacy'),
    text(', '),
    link('FAQ', '/faq'),
    text(', '),
    link(
      'public source repository',
      'https://github.com/Significant-Hobbies/karte',
    ),
    text(", and Linktree's first-party documentation for "),
    link(
      'classic links',
      'https://linktr.ee/help/en/articles/5434135-how-to-create-a-link-on-linktree',
    ),
    text(' and '),
    link(
      'embedded Link Apps',
      'https://linktr.ee/help/en/articles/8614037-adding-links-what-s-possible',
    ),
    text(
      '. Product behavior can change; prefer the live Karte skill and privacy page when they differ from this guide.',
    ),
  ]),
  closing: Object.freeze([
    text('Ready to make the public page? '),
    link('Draft your Karte profile', '/create'),
    text('. Publishing an AI agent? '),
    link('Start with the agent skill', '/skill.md'),
    text('.'),
  ]),
});

export const AI_LINK_IN_BIO_ROUTE = Object.freeze({
  path: AI_LINK_IN_BIO_PAGE.path,
  title: AI_LINK_IN_BIO_PAGE.title,
  description: AI_LINK_IN_BIO_PAGE.description,
  changeFrequency: 'monthly',
  priority: 0.8,
  owner: 'astro',
  markdown: [
    'Karte compares conventional link routing with a source-bounded conversational profile.',
    'The guide explains public trust cards, agent.json declarations, privacy boundaries, useful questions, and human or agent publishing workflows.',
    'It states when a conventional link page is enough and does not present declared operator URLs as verified identity.',
  ],
});

export const richTextPlain = (parts) => parts.map((part) => part.text).join('');

const richTextMarkdown = (parts) =>
  parts
    .map((part) => {
      if (part.href) return `[${part.text}](${part.href})`;
      if (part.code) return `\`${part.text}\``;
      return part.text;
    })
    .join('');

function renderMarkdown() {
  const page = AI_LINK_IN_BIO_PAGE;
  const lines = [
    `# ${page.heading}`,
    '',
    ...page.intro.flatMap((paragraph) => [richTextMarkdown(paragraph), '']),
    `${page.actions.map((action) => `[${action.label}](${action.href})`).join(' · ')}`,
    '',
    `## ${page.comparison.heading}`,
    '',
    `| ${page.comparison.columns.join(' | ')} |`,
    `| ${page.comparison.columns.map(() => '---').join(' | ')} |`,
    ...page.comparison.rows.map((row) => `| ${row.join(' | ')} |`),
    '',
    richTextMarkdown(page.comparison.note),
    '',
    `## ${page.questions.heading}`,
    '',
    richTextMarkdown(page.questions.intro),
    '',
    ...page.questions.items.map((item) => `- ${item}`),
    '',
    richTextMarkdown(page.questions.limitation),
    '',
    `## ${page.agentInspection.heading}`,
    '',
    richTextMarkdown(page.agentInspection.intro),
    '',
    ...page.agentInspection.items.map((item) => `- ${item}`),
    '',
    richTextMarkdown(page.agentInspection.limitation),
    '',
    `[${page.agentInspection.action.label}](${page.agentInspection.action.href})`,
    '',
    `## ${page.boundaries.heading}`,
    '',
  ];

  for (const group of page.boundaries.groups) {
    lines.push(`### ${group.heading}`, '');
    for (const paragraph of group.paragraphs) {
      lines.push(richTextMarkdown(paragraph), '');
    }
  }

  lines.push(`## ${page.workflows.heading}`, '');
  for (const group of page.workflows.groups) {
    lines.push(`### ${group.heading}`, '');
    group.steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${richTextMarkdown(step)}`);
    });
    lines.push('');
  }

  lines.push('## Frequently asked questions', '');
  for (const faq of page.faqs) {
    lines.push(`### ${faq.question}`, '', richTextMarkdown(faq.answer), '');
  }
  lines.push(
    '## Sources and next steps',
    '',
    richTextMarkdown(page.sources),
    '',
    richTextMarkdown(page.closing),
    '',
  );
  return lines.join('\n');
}

export const AI_LINK_IN_BIO_MARKDOWN = renderMarkdown();
