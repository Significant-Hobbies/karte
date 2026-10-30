import content from '../../landing-astro/src/content/home.json';
import {
  onyxExamples,
  onyxSteps,
  onyxSurfaces,
  onyxTitles,
} from '../../landing-astro/src/content/onyx-deck';

const origin = content.url;
const link = (value: { label: string; href: string }) =>
  `[${value.label}](${new URL(value.href, origin).href})`;
export function publicHomeMarkdown(): string {
  const { hero, sections, closing } = content;
  const lines = [
    `# ${onyxTitles.hero}`,
    hero.eyebrow,
    hero.lede,
    link(hero.primary),
    link(hero.secondary),
    hero.note,
    `## ${onyxTitles.how}`,
  ];
  for (const step of onyxSteps) lines.push(`### ${step.title}`, step.body);
  for (const surface of onyxSurfaces)
    lines.push(`### ${surface.title}`, surface.body);
  lines.push(`## ${onyxTitles.boundary}`);
  for (const section of sections) {
    lines.push(`## ${section.title}`);
    if (section.eyebrow) lines.push(section.eyebrow);
    if (section.lede) lines.push(section.lede);
    if (section.kind === 'faq' && section.items)
      for (const item of section.items) lines.push(`### ${item.q}`, item.a);
    else if (section.kind !== 'statement' && section.kind !== 'spread')
      throw new Error(`Unmapped Onyx section: ${section.kind}`);
  }
  lines.push(`## ${onyxTitles.examples}`);
  for (const example of onyxExamples)
    lines.push(
      `### ${example.title}`,
      example.body,
      link({ label: example.label, href: example.href }),
    );
  lines.push(
    `## ${onyxTitles.cta}`,
    closing.note,
    closing.form.label,
    closing.form.placeholder,
    `[${closing.form.submit}](${closing.form.action})`,
  );
  return `${lines.join('\n\n')}\n\n> Source: ${origin}/\n`;
}
