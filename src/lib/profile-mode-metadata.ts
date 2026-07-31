import type { Metadata } from 'next';

import {
  getGeneratedPage,
  getPageBySlug,
} from '@/app/[slug]/_lib/get-page-data';
import {
  metadataForProfile,
  privateRouteMetadata,
} from '@/lib/public-route-metadata';

const MODE_ENABLED_FIELD = {
  encyclopedia: 'encyclopediaEnabled',
  newspaper: 'newspaperEnabled',
  roast: 'roastEnabled',
} as const;

const MODE_LABEL = {
  encyclopedia: 'Encyclopedia',
  newspaper: 'Newspaper',
  roast: 'Roast',
} as const;

type ProfileMode = keyof typeof MODE_ENABLED_FIELD;

export async function metadataForProfileMode(
  slug: string,
  mode: ProfileMode,
): Promise<Metadata> {
  const label = MODE_LABEL[mode];
  const page = await getPageBySlug(slug);
  if (!page?.[MODE_ENABLED_FIELD[mode]]) {
    return privateRouteMetadata(`${label} profile unavailable — Karte`);
  }

  const generated = await getGeneratedPage(page.id, mode);
  if (generated?.status !== 'ready' || !generated.content) {
    return privateRouteMetadata(`${label} profile unavailable — Karte`);
  }

  return metadataForProfile({
    path: `/${slug}/${mode}`,
    displayName: page.displayName,
    description: page.bio,
    image: page.avatarUrl,
    mode: label,
  });
}
