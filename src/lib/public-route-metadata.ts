import type { Metadata } from 'next';

import {
  SITE_ORIGIN,
  staticPublicRoute,
} from '../../public-route-contract.mjs';

const DEFAULT_IMAGE = `${SITE_ORIGIN}/opengraph-image`;

export function metadataForStaticPath(pathname: string): Metadata {
  const route = staticPublicRoute(pathname);
  if (!route) throw new Error(`Unknown public static route: ${pathname}`);
  return buildPublicMetadata({
    path: route.path,
    title: route.title,
    description: route.description,
  });
}

export function metadataForProfile({
  path,
  displayName,
  description,
  image,
  mode,
}: {
  path: string;
  displayName: string;
  description: string | null;
  image?: string | null;
  mode?: 'Encyclopedia' | 'Newspaper' | 'Roast';
}): Metadata {
  const title = mode ? `${displayName} ${mode}` : displayName;
  const fallback = mode
    ? `${mode} profile for ${displayName} on Karte.`
    : `${displayName}'s public profile, links, projects, and inbound assistant on Karte.`;
  return buildPublicMetadata({
    path,
    title,
    description: description?.trim() || fallback,
    image,
  });
}

export function privateRouteMetadata(title: string): Metadata {
  return {
    title: { absolute: title },
    robots: { follow: false, index: false },
  };
}

function buildPublicMetadata({
  path,
  title,
  description,
  image,
}: {
  path: string;
  title: string;
  description: string;
  image?: string | null;
}): Metadata {
  const canonical = new URL(path, SITE_ORIGIN).toString();
  const socialImage = absoluteUrl(image, DEFAULT_IMAGE);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: 'Karte',
      title,
      description,
      images: [{ url: socialImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [socialImage],
    },
  };
}

function absoluteUrl(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  try {
    return new URL(value, SITE_ORIGIN).toString();
  } catch {
    return fallback;
  }
}
