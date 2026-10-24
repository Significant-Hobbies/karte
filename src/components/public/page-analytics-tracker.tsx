'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { trackEvent } from '@/lib/analytics';
import { getAnalyticsLabels } from '@/lib/analytics-labels';

function isExternalUrl(href: string) {
  try {
    const url = new URL(href, window.location.href);
    if (['mailto:', 'tel:'].includes(url.protocol)) {
      return true;
    }

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.origin !== window.location.origin
      : false;
  } catch {
    return false;
  }
}

function getAnalyticsSlug() {
  // Only the public profile layout supplies this marker. App/static routes
  // (including /create) are not profile slugs; custom-domain profiles and
  // generated modes still carry the marker even when their URL is different.
  return (
    document.querySelector<HTMLElement>('[data-karte-public-slug]')?.dataset
      .kartePublicSlug || null
  );
}

export function PageAnalyticsTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    const slug = getAnalyticsSlug();
    const analyticsLabels = getAnalyticsLabels();
    const { profileVariant } = analyticsLabels;
    const trackedPath = `${slug ?? pathname}?variant=${profileVariant}`;
    if (!slug || lastTrackedPath.current === trackedPath) {
      return;
    }

    lastTrackedPath.current = trackedPath;

    trackEvent(slug, {
      eventType: 'page_view',
      metadata: {
        pathname,
        ...analyticsLabels,
        referrer: document.referrer || null,
      },
    });
  }, [pathname]);

  useEffect(() => {
    const analyticsSlug = getAnalyticsSlug();
    if (!analyticsSlug) {
      return;
    }
    const slug = analyticsSlug;

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest('a');
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href || !isExternalUrl(href)) {
        return;
      }

      const analyticsLabels = getAnalyticsLabels();

      trackEvent(slug, {
        eventType: 'outbound_click',
        resourceType: anchor.getAttribute('data-track-type') || 'outbound',
        resourceId: anchor.getAttribute('data-track-id') || href,
        resourceLabel:
          anchor.getAttribute('data-track-label') ||
          anchor.getAttribute('aria-label') ||
          anchor.textContent?.trim() ||
          href,
        metadata: {
          href,
          ...analyticsLabels,
        },
      });
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [pathname]);

  return null;
}
