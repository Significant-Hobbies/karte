import type { MetadataRoute } from 'next';

import {
  ROBOTS_ALLOW,
  ROBOTS_DISALLOW,
  SITE_ORIGIN,
} from '../../public-route-contract.mjs';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [...ROBOTS_ALLOW],
        disallow: [...ROBOTS_DISALLOW],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
