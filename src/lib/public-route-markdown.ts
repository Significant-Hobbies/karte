import {
  getFreshPublicPageData,
  getGeneratedPage,
} from '@/app/[slug]/_lib/get-page-data';
import { normalizeEncyclopediaContent } from '@/lib/encyclopedia-compat';
import {
  getNewspaperPages,
  type NewspaperContent,
  type RoastContent,
} from '@/lib/generated-page-types';
import { ARTICLE_MARKDOWN, ARTICLES } from '../../content-pages/articles.mjs';
import { articleDisplayMeta } from '../../content-pages/public-editorial.mjs';
import {
  parsePublicHtmlPath,
  SITE_ORIGIN,
} from '../../public-route-contract.mjs';
import { resolvePublicProfileSlug } from './demo-profiles';
import { publicProfileMarkdown } from './public-profile-source';
import { renderPublicStaticSource } from './public-static-source';
import { richSourceMarkdown } from './rich-source-markdown';
import { isCompletePublicUrl } from './validation';

export async function renderPublicRouteMarkdown(
  pathname: string,
): Promise<string | null> {
  const parsed = parsePublicHtmlPath(pathname);
  if (!parsed) return null;
  const source = `${SITE_ORIGIN}${parsed.path === '/' ? '' : parsed.path}`;

  if (parsed.kind === 'static') return renderPublicStaticSource(parsed.path);

  if (parsed.kind === 'article') return renderArticle(parsed.slug, source);

  if (!parsed.slug) return null;
  const data = await getFreshPublicPageData(
    resolvePublicProfileSlug(parsed.slug),
  );
  if (!data) return null;
  if (parsed.kind === 'profile')
    return publicProfileMarkdown(resolvePublicProfileSlug(parsed.slug), data);

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
    return renderEncyclopedia(
      data.page.displayName,
      generated.content,
      source,
      data.page.avatarUrl,
    );
  }
  if (mode === 'newspaper') {
    return renderNewspaper(
      data.page.displayName,
      generated.content as unknown as NewspaperContent,
      source,
      data.page.avatarUrl,
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

type PublicPageData = NonNullable<
  Awaited<ReturnType<typeof getFreshPublicPageData>>
>;
type ProfileMode = 'encyclopedia' | 'newspaper' | 'roast';

function isProfileMode(value: unknown): value is ProfileMode {
  return value === 'encyclopedia' || value === 'newspaper' || value === 'roast';
}

function renderEncyclopedia(
  displayName: string,
  content: unknown,
  source: string,
  avatarUrl?: string | null,
) {
  const normalized = normalizeEncyclopediaContent(content);
  if (!normalized) return null;
  const article = richSourceMarkdown(normalized.markdown);
  const infobox = Object.entries(normalized.infobox ?? {}).map(
    ([key, value]) => `- **${plain(key)}:** ${plain(value)}`,
  );
  const blocks = [
    publicImage(displayName, avatarUrl),
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
  avatarUrl?: string | null,
) {
  const pages = getNewspaperPages(content);
  if (pages.length === 0) return null;
  const blocks = pages.map((page, index) => {
    const stories = [
      `### ${plain(page.leadStory.headline)}\n\n${plain(page.leadStory.subheadline)}\n\n${paragraphs(page.leadStory.body)}${
        page.leadStory.pullQuote
          ? `\n\n> ${plain(page.leadStory.pullQuote)}`
          : ''
      }`,
      ...page.secondaryStories.map(
        (story) => `### ${plain(story.headline)}\n\n${paragraphs(story.body)}`,
      ),
      ...(page.sidebar?.facts ?? []).map((fact) => `- ${plain(fact)}`),
      page.sidebar?.mood ? `Mood: ${plain(page.sidebar.mood)}` : '',
      ...(page.fakeAds ?? []).map((ad) => `Advertisement: ${plain(ad)}`),
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
    [publicImage(displayName, avatarUrl), ...blocks],
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
    content.bestLink
      ? `- Best link: ${plain(content.bestLink.title)} — ${plain(content.bestLink.reason)}`
      : '',
    content.worstLink
      ? `- Worst link: ${plain(content.worstLink.title)} — ${plain(content.worstLink.reason)}`
      : '',
    content.spiritPlatform
      ? `- Spirit platform: ${plain(content.spiritPlatform)}`
      : '',
    content.celebrityMatch
      ? `- Celebrity match: ${plain(content.celebrityMatch)}`
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

function paragraphs(value: string) {
  return value.split('\n').map(plain).filter(Boolean).join('\n\n');
}

function publicImage(label: string, url?: string | null) {
  return url && isCompletePublicUrl(url) ? `![${plain(label)}](${url})` : '';
}

function renderArticle(slug: string, source: string) {
  const body = ARTICLE_MARKDOWN[slug];
  if (!body) return null;
  const meta = ARTICLES.find((article) => article.slug === slug);
  return document(
    meta?.title ?? slug,
    source,
    meta?.description ?? '',
    [
      'Karte article',
      ...(meta ? [articleDisplayMeta(meta).join(' · ')] : []),
      body,
    ],
    false,
  );
}
