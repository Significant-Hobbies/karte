import { and, eq } from 'drizzle-orm';
import type { MetadataRoute } from 'next';

import { db } from '@/db';
import { generatedPages, pages } from '@/db/schema';
import {
  buildPublicProfilePaths,
  PROFILE_MODES,
  SITE_ORIGIN,
  STATIC_PUBLIC_ROUTES,
} from '../../public-route-contract.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]['changeFrequency']
>;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = STATIC_PUBLIC_ROUTES.map(
    (route) => ({
      url: `${SITE_ORIGIN}${route.path === '/' ? '' : route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency as ChangeFrequency,
      priority: route.priority,
    }),
  );

  let profileRoutes: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({
        id: pages.id,
        slug: pages.slug,
        published: pages.published,
        updatedAt: pages.updatedAt,
        encyclopediaEnabled: pages.encyclopediaEnabled,
        roastEnabled: pages.roastEnabled,
        newspaperEnabled: pages.newspaperEnabled,
        readyType: generatedPages.type,
        readyContent: generatedPages.content,
      })
      .from(pages)
      .leftJoin(
        generatedPages,
        and(
          eq(generatedPages.pageId, pages.id),
          eq(generatedPages.status, 'ready'),
        ),
      )
      .where(eq(pages.published, true))
      .limit(50_000);

    const published = new Map<
      string,
      {
        page: (typeof rows)[number];
        readyTypes: Set<string>;
      }
    >();
    for (const row of rows) {
      const current = published.get(row.id) ?? {
        page: row,
        readyTypes: new Set<string>(),
      };
      if (row.readyType && row.readyContent) {
        current.readyTypes.add(row.readyType);
      }
      published.set(row.id, current);
    }

    const modeBySegment = new Map(
      PROFILE_MODES.map((mode) => [mode.segment, mode]),
    );
    profileRoutes = Array.from(published.values()).flatMap(
      ({ page, readyTypes }) => {
        const lastModified =
          page.updatedAt instanceof Date
            ? page.updatedAt
            : page.updatedAt
              ? new Date(page.updatedAt)
              : now;
        return buildPublicProfilePaths(page, readyTypes).map((path) => {
          const mode = modeBySegment.get(path.split('/')[2] ?? '');
          return {
            url: `${SITE_ORIGIN}${path}`,
            lastModified,
            changeFrequency: (mode?.changeFrequency ??
              'weekly') as ChangeFrequency,
            priority: mode?.priority ?? 0.7,
          };
        });
      },
    );
  } catch {
    /* D1 offline at build — static-only fallback */
  }

  return [...staticRoutes, ...profileRoutes];
}
