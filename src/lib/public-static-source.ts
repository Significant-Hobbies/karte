import Link from 'next/link';
import { createElement } from 'react';
import AboutPage from '@/app/about/page';
import PrivacyPage from '@/app/privacy/page';
import TermsPage from '@/app/terms/page';
import { AI_LINK_IN_BIO_MARKDOWN } from '../../content-pages/ai-link-in-bio.mjs';
import { ARTICLES } from '../../content-pages/articles.mjs';
import {
  articlesCopy,
  changelogCopy,
  displayDate,
  faqCopy,
  releases,
} from '../../content-pages/public-editorial.mjs';
import { faqs, product } from '../../landing-astro/src/lib/product';
import { publicCreateMarkdown } from './public-create-source';
import { publicHomeMarkdown } from './public-home-source';
import { reactSourceMarkdown } from './react-source-markdown';

const origin = 'https://karte.cc';
const pages = {
  '/about': AboutPage,
  '/privacy': PrivacyPage,
  '/terms': TermsPage,
};
const link = (value: { label: string; href: string }) =>
  `[${value.label}](${new URL(value.href, origin).href})`;
export function renderPublicStaticSource(path: string): string | null {
  if (path === '/create') return publicCreateMarkdown();
  if (path === '/') return publicHomeMarkdown();
  if (path === '/ai-link-in-bio') return AI_LINK_IN_BIO_MARKDOWN;
  if (Object.hasOwn(pages, path)) {
    const Page = pages[path as keyof typeof pages];
    return `${reactSourceMarkdown(Page(), { origin, components: [], adapters: new Map([[Link, (props) => createElement('a', { href: props.href }, props.children)]]) })}\n\n> Source: ${origin}${path}\n`;
  }
  let lines: string[];
  if (path === '/faq')
    lines = [
      `# ${faqCopy.title} *${faqCopy.emphasis}*`,
      faqCopy.eyebrow,
      `${product.purpose} ${faqCopy.conclusion}`,
      ...faqs.flatMap((faq, index) => [
        `## ${String(index + 1).padStart(2, '0')} ${faq.question}`,
        faq.answer,
      ]),
      link(faqCopy.primary),
      link(faqCopy.secondary),
    ];
  else if (path === '/changelog')
    lines = [
      `# ${changelogCopy.title}`,
      changelogCopy.eyebrow,
      changelogCopy.lede,
      ...releases.flatMap((release) => [
        `## ${release.title}`,
        displayDate(release.date),
        ...release.outcomes.map((outcome) => `- ${outcome}`),
      ]),
    ];
  else if (path === '/articles')
    lines = [
      `# ${articlesCopy.title}`,
      articlesCopy.eyebrow,
      articlesCopy.lede,
      ...[...ARTICLES]
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
        )
        .flatMap((article) => [
          `## [${article.title}](${origin}/articles/${article.slug})`,
          displayDate(article.date),
          article.description,
          `${article.readingMinutes} min read`,
        ]),
    ];
  else return null;
  return `${lines.join('\n\n')}\n\n> Source: ${origin}${path}\n`;
}
