import {
  getFullPageData,
  getGeneratedPage,
} from '@/app/[slug]/_lib/get-page-data';
import { normalizeEncyclopediaContent } from '@/lib/encyclopedia-compat';
import {
  getNewspaperPages,
  type NewspaperContent,
  type RoastContent,
} from '@/lib/generated-page-types';
import {
  parsePublicHtmlPath,
  SITE_ORIGIN,
} from '../../public-route-contract.mjs';

export async function renderPublicRouteMarkdown(
  pathname: string,
): Promise<string | null> {
  const parsed = parsePublicHtmlPath(pathname);
  if (!parsed) return null;
  const source = `${SITE_ORIGIN}${parsed.path === '/' ? '' : parsed.path}`;

  if (parsed.kind === 'static') {
    const route = parsed.route;
    if (!route) return null;
    return document(
      route.title,
      source,
      route.description,
      route.markdown.map((paragraph: string) => plain(paragraph)),
    );
  }

  if (!parsed.slug) return null;
  const data = await getFullPageData(parsed.slug);
  if (!data) return null;
  if (parsed.kind === 'profile') return renderProfile(data, source);

  const mode = parsed.mode?.segment;
  if (
    !isProfileMode(mode) ||
    !modeEnabled(data.page, mode) ||
    !data.readyPages.has(mode)
  ) {
    return null;
  }
  const generated = await getGeneratedPage(data.page.id, mode);
  if (generated?.status !== 'ready' || !generated.content) return null;

  if (mode === 'encyclopedia') {
    return renderEncyclopedia(data.page.displayName, generated.content, source);
  }
  if (mode === 'newspaper') {
    return renderNewspaper(
      data.page.displayName,
      generated.content as unknown as NewspaperContent,
      source,
    );
  }
  if (mode === 'roast') {
    return renderRoast(
      data.page.displayName,
      generated.content as unknown as RoastContent,
      source,
    );
  }
  return null;
}

function modeEnabled(page: PublicPageData['page'], mode: ProfileMode) {
  if (mode === 'encyclopedia') return Boolean(page.encyclopediaEnabled);
  if (mode === 'newspaper') return Boolean(page.newspaperEnabled);
  return Boolean(page.roastEnabled);
}

type PublicPageData = NonNullable<Awaited<ReturnType<typeof getFullPageData>>>;
type ProfileMode = 'encyclopedia' | 'newspaper' | 'roast';

function isProfileMode(value: unknown): value is ProfileMode {
  return value === 'encyclopedia' || value === 'newspaper' || value === 'roast';
}

function renderProfile(data: PublicPageData, source: string) {
  const { page, links, projects, sections, timeline } = data;
  const blocks: string[] = [];

  if (page.location) blocks.push(`Location: ${plain(page.location)}`);
  if (page.pageType === 'agent') {
    if (page.agentOperator) {
      blocks.push(`Operator: ${plain(page.agentOperator)}`);
    }
    const capabilities = Array.isArray(page.agentCapabilities)
      ? page.agentCapabilities
          .map(describeCapability)
          .filter(Boolean)
          .map((capability) => `- ${capability}`)
      : [];
    if (capabilities.length > 0) {
      blocks.push(`## Capabilities\n\n${capabilities.join('\n')}`);
    }
    if (page.agentDisclosurePolicy) {
      blocks.push(
        `## Disclosure policy\n\n${plain(page.agentDisclosurePolicy)}`,
      );
    }
  }

  if (links.length > 0) {
    blocks.push(
      `## Links\n\n${links
        .map((link) => `- [${plain(link.title)}](${link.url})`)
        .join('\n')}`,
    );
  }
  if (projects.length > 0) {
    blocks.push(
      `## Projects\n\n${projects
        .map((project) => {
          const title = plain(project.title);
          const label = project.url ? `[${title}](${project.url})` : title;
          return `- ${label}${project.description ? ` — ${plain(project.description)}` : ''}`;
        })
        .join('\n')}`,
    );
  }
  for (const section of sections) {
    const content = publicSectionMarkdown(section);
    if (content) blocks.push(`## ${plain(section.title)}\n\n${content}`);
  }
  if (timeline.length > 0) {
    blocks.push(
      `## Timeline\n\n${timeline
        .map((event) => {
          const title = event.link
            ? `[${plain(event.title)}](${event.link})`
            : plain(event.title);
          const detail = [
            plain(event.whenLabel),
            event.whereLabel ? plain(event.whereLabel) : '',
            event.body ? plain(event.body) : '',
          ]
            .filter(Boolean)
            .join(' — ');
          return `- ${title}${detail ? ` — ${detail}` : ''}`;
        })
        .join('\n')}`,
    );
  }

  return document(
    page.displayName,
    source,
    page.agentPurpose ??
      page.bio ??
      `${page.displayName}'s public profile on Karte.`,
    blocks,
    false,
  );
}

function renderEncyclopedia(
  displayName: string,
  content: unknown,
  source: string,
) {
  const normalized = normalizeEncyclopediaContent(content);
  if (!normalized) return null;
  const article = htmlFragmentToMarkdown(normalized.markdown);
  const infobox = Object.entries(normalized.infobox ?? {}).map(
    ([key, value]) => `- **${plain(key)}:** ${plain(value)}`,
  );
  const blocks = [
    infobox.length > 0 ? `## Profile\n\n${infobox.join('\n')}` : '',
    article,
    normalized.categories?.length
      ? `## Categories\n\n${normalized.categories.map((item) => `- ${plain(item)}`).join('\n')}`
      : '',
  ].filter(Boolean);
  if (blocks.length === 0) return null;
  return document(
    `${displayName} encyclopedia`,
    source,
    `A generated reference-style profile for ${displayName}.`,
    blocks,
    false,
  );
}

function renderNewspaper(
  displayName: string,
  content: NewspaperContent,
  source: string,
) {
  const pages = getNewspaperPages(content);
  if (pages.length === 0) return null;
  const blocks = pages.map((page, index) => {
    const stories = [
      `### ${plain(page.leadStory.headline)}\n\n${plain(page.leadStory.subheadline)}\n\n${plain(page.leadStory.body)}${
        page.leadStory.pullQuote
          ? `\n\n> ${plain(page.leadStory.pullQuote)}`
          : ''
      }`,
      ...page.secondaryStories.map(
        (story) => `### ${plain(story.headline)}\n\n${plain(story.body)}`,
      ),
    ];
    return `## ${plain(page.sectionLabel ?? `Page ${index + 1}`)}\n\n${stories.join('\n\n')}`;
  });
  return document(
    content.mastheadName || `${displayName} newspaper`,
    source,
    [content.dateline, `A generated newspaper profile for ${displayName}.`]
      .filter(Boolean)
      .map(plain)
      .join(' — '),
    blocks,
    false,
  );
}

function renderRoast(
  displayName: string,
  content: RoastContent,
  source: string,
) {
  if (!content.roast) return null;
  const details = [
    content.personalityType
      ? `- Personality type: ${plain(content.personalityType)}`
      : '',
    Number.isFinite(content.vibeScore)
      ? `- Vibe score: ${content.vibeScore}`
      : '',
    content.bioAutopsy ? `- Bio autopsy: ${plain(content.bioAutopsy)}` : '',
    content.firstImpression
      ? `- First impression: ${plain(content.firstImpression)}`
      : '',
    ...(content.redFlags ?? []).map((flag) => `- ${plain(flag)}`),
  ].filter(Boolean);
  return document(
    `Roast of ${displayName}`,
    source,
    `A playful generated roast of ${displayName}'s public Karte profile.`,
    [
      plain(content.roast),
      details.length > 0 ? `## Scorecard\n\n${details.join('\n')}` : '',
    ],
    false,
  );
}

function publicSectionMarkdown(section: {
  content: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
}) {
  const parts = [];
  if (section.content) {
    parts.push(
      section.content
        .split('\n')
        .map((line) => plain(line))
        .filter(Boolean)
        .join('\n'),
    );
  }
  if (section.buttonLabel && section.buttonUrl) {
    parts.push(`[${plain(section.buttonLabel)}](${section.buttonUrl})`);
  }
  return parts.join('\n\n');
}

function describeCapability(capability: unknown) {
  if (typeof capability === 'string') return plain(capability);
  if (!capability || typeof capability !== 'object') return '';
  const value = capability as Record<string, unknown>;
  const label = value.label ?? value.name ?? value.id ?? value.key;
  const description = value.description ?? value.summary;
  if (typeof label !== 'string') return '';
  return `${plain(label)}${
    typeof description === 'string' ? ` — ${plain(description)}` : ''
  }`;
}

function htmlFragmentToMarkdown(html: string) {
  if (!html.trim()) return '';
  return decodeEntities(
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(
        /<a\b[^>]*href=(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,
        (_match, doubleQuoted, singleQuoted, label) =>
          `[${stripTags(label)}](${doubleQuoted || singleQuoted})`,
      )
      .replace(
        /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
        (_match, level, value) =>
          `\n\n${'#'.repeat(Number(level))} ${stripTags(value)}\n\n`,
      )
      .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_match, value) => {
        return `\n- ${stripTags(value)}`;
      })
      .replace(
        /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi,
        (_match, value) => `\n\n> ${stripTags(value)}\n\n`,
      )
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(p|div|section|article|ul|ol)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripTags(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
      if (code.startsWith('#')) {
        const numeric =
          code[1]?.toLowerCase() === 'x'
            ? Number.parseInt(code.slice(2), 16)
            : Number.parseInt(code.slice(1), 10);
        return Number.isFinite(numeric)
          ? String.fromCodePoint(numeric)
          : entity;
      }
      return named[code.toLowerCase()] ?? entity;
    },
  );
}

function document(
  title: string,
  source: string,
  description: string,
  blocks: string[],
  listBlocks = true,
) {
  const body = blocks
    .filter(Boolean)
    .map((block) => (listBlocks ? `- ${block}` : block))
    .join('\n\n');
  return `# ${plain(title)}\n\n> Source: ${source}\n\n${plain(description)}${
    body ? `\n\n${body}` : ''
  }\n`;
}

function plain(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}
