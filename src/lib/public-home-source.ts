import content from '../../landing-astro/src/content/home.json';

const origin = content.url;
const link = (value: { label: string; href: string }) =>
  `[${value.label}](${new URL(value.href, origin).href})`;
const media = (value: { src: string; alt: string }) =>
  `![${value.alt}](${new URL(value.src, new URL(content.page.assetBase, origin)).href})`;
export function publicHomeMarkdown(): string {
  const { hero, sections, closing } = content;
  const lines = [
    `# ${hero.title}`,
    hero.eyebrow,
    hero.lede,
    link(hero.primary),
    link(hero.secondary),
    hero.note,
    media(hero.card),
  ];
  for (const section of sections) {
    lines.push(`## ${section.title}`);
    if (section.eyebrow) lines.push(section.eyebrow);
    if (section.lede) lines.push(section.lede);
    if (section.kind === 'spread' && section.screen && section.caption)
      lines.push(media(section.screen), section.caption.text);
    else if (section.kind === 'faq' && section.items)
      for (const item of section.items) lines.push(`### ${item.q}`, item.a);
    else if (section.kind !== 'statement')
      throw new Error(`Unmapped Gallery section: ${section.kind}`);
  }
  lines.push(
    `## ${closing.title}`,
    closing.note,
    closing.form.label,
    closing.form.placeholder,
    `[${closing.form.submit}](${closing.form.action})`,
  );
  return `${lines.join('\n\n')}\n\n> Source: ${origin}/\n`;
}
